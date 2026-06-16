import pako from 'pako';
import { TEAMS, SPECIALS } from '../constants';

export interface Lamina {
  section: string;
  number: number;
}

export interface DecodedLaminasResult {
  missing: Lamina[];
  repeated: Lamina[];
  faltantes: Lamina[];
  repetidas: Lamina[];
}

/**
 * Gets the order of segments dynamically.
 * Index 0: 'FWC' (strict requirement)
 * Indices 1-48+: mapped to the teams array.
 */
export function getSectionsOrder(customTeams?: string[]): string[] {
  const teams = customTeams || TEAMS;
  return ['FWC', ...teams];
}

/**
 * Parses a sticker code string (e.g. "FWC", "FWC5", "ARG20") into a Lamina structure
 */
export function codeToLamina(code: string): Lamina | null {
  if (code === 'FWC') {
    return { section: 'FWC', number: 0 };
  }
  const match = code.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    return null;
  }
  const section = match[1];
  const number = parseInt(match[2], 10);
  return { section, number };
}

/**
 * Formats a Lamina structure back to a sticker code string
 */
export function laminaToCode(lamina: Lamina): string {
  if (lamina.section === 'FWC' && lamina.number === 0) {
    return 'FWC';
  }
  return `${lamina.section}${lamina.number}`;
}

/**
 * Gets the fixed list of 994 sticker codes in the deterministic order
 */
export function getStickerCodesOrder(cocaColaCount: number = 14): string[] {
  const albumCC = Array.from({ length: cocaColaCount }, (_, i) => `CC${i + 1}`);
  return [
    ...SPECIALS,
    ...TEAMS.flatMap(t => Array.from({ length: 20 }, (_, i) => `${t}${i + 1}`)),
    ...albumCC
  ];
}

/**
 * Converts lists of missing and repeated Laminas into a packed QR string compatible with:
 * ⋋~[Faltantes_Base64_GZIP];[Repetidas_Base64_GZIP]
 */
export function encodeLaminasToQRString(
  missingLaminas: Lamina[],
  repeatedLaminas: Lamina[],
  teamsList?: string[]
): string {
  const missingBitfield = new Uint8Array(125); // 125 bytes = 1000 bits
  const repeatedBitfield = new Uint8Array(125);
  const sectionsOrder = getSectionsOrder(teamsList);

  // Encode missing with Little-Endian bits
  for (const lamina of missingLaminas) {
    const sIdx = sectionsOrder.indexOf(lamina.section);
    if (sIdx === -1) continue;
    const internalBit = lamina.section === 'FWC' ? lamina.number : (lamina.number - 1);
    const globalBitIndex = (sIdx * 20) + internalBit;
    if (globalBitIndex >= 0 && globalBitIndex < 1000) {
      const byteIdx = Math.floor(globalBitIndex / 8);
      const bitIdx = globalBitIndex % 8;
      // Little-endian
      missingBitfield[byteIdx] |= (1 << bitIdx);
    }
  }

  // Encode repeated with Little-Endian bits
  for (const lamina of repeatedLaminas) {
    const sIdx = sectionsOrder.indexOf(lamina.section);
    if (sIdx === -1) continue;
    const internalBit = lamina.section === 'FWC' ? lamina.number : (lamina.number - 1);
    const globalBitIndex = (sIdx * 20) + internalBit;
    if (globalBitIndex >= 0 && globalBitIndex < 1000) {
      const byteIdx = Math.floor(globalBitIndex / 8);
      const bitIdx = globalBitIndex % 8;
      // Little-endian
      repeatedBitfield[byteIdx] |= (1 << bitIdx);
    }
  }

  const missingCompressed = pako.gzip(missingBitfield);
  const repeatedCompressed = pako.gzip(repeatedBitfield);

  const missingBase64 = uint8ToBase64(missingCompressed);
  const repeatedBase64 = uint8ToBase64(repeatedCompressed);

  return `⋋~${missingBase64};${repeatedBase64}`;
}

/**
 * Overloaded function to encode inventory or specified Lamina arrays.
 * Supports both signatures:
 * 1. encodeInventoryToQRString(faltantes: Lamina[], repetidas: Lamina[], teamsList?: string[]): string
 * 2. encodeInventoryToQRString(inventory: Record<string, any>, cocaColaCount?: number, teamsList?: string[]): string
 */
export function encodeInventoryToQRString(
  faltantes: Lamina[],
  repetidas: Lamina[],
  teamsList?: string[]
): string;
export function encodeInventoryToQRString(
  inventory: Record<string, any>,
  cocaColaCount?: number,
  teamsList?: string[]
): string;
export function encodeInventoryToQRString(
  firstArg: Lamina[] | Record<string, any>,
  secondArg?: Lamina[] | number,
  thirdArg?: string[]
): string {
  if (Array.isArray(firstArg)) {
    // Signature: encodeInventoryToQRString(faltantes: Lamina[], repetidas: Lamina[], teamsList?: string[]): string
    const faltantes = firstArg as Lamina[];
    const repetidas = (Array.isArray(secondArg) ? secondArg : []) as Lamina[];
    const teamsList = thirdArg;
    return encodeLaminasToQRString(faltantes, repetidas, teamsList);
  } else {
    // Signature: encodeInventoryToQRString(inventory: Record<string, any>, cocaColaCount = 14, teamsList?: string[]): string
    const inventory = firstArg as Record<string, any>;
    const cocaColaCount = typeof secondArg === 'number' ? secondArg : 14;
    const teamsList = thirdArg;

    const allCodes = getStickerCodesOrder(cocaColaCount);
    const missingLaminas: Lamina[] = [];
    const repeatedLaminas: Lamina[] = [];

    for (const code of allCodes) {
      const lamina = codeToLamina(code);
      if (!lamina) continue;

      const item = inventory[code];
      const count = item?.count || item?.quantity || 0;
      
      const isMissing = !item || item.status === 'missing' || count === 0;
      const isRepeated = item?.status === 'repeated' || count > 1;

      if (isMissing) {
        missingLaminas.push(lamina);
      }
      if (isRepeated) {
        repeatedLaminas.push(lamina);
      }
    }

    return encodeLaminasToQRString(missingLaminas, repeatedLaminas, teamsList);
  }
}

/**
 * Decodes the QR string into missing and repeated Lamina lists.
 * Returns both English properties (missing/repeated) and Spanish properties (faltantes/repetidas)
 * for seamless backward and forward compatibility.
 */
export function decodeQRStringToLaminas(
  qrString: string,
  teamsList?: string[]
): DecodedLaminasResult {
  const missing: Lamina[] = [];
  const repeated: Lamina[] = [];

  if (!qrString.startsWith('⋋~')) {
    return { missing, repeated, faltantes: missing, repetidas: repeated };
  }

  try {
    const parts = qrString.substring(2).split(';');
    if (parts.length !== 2) {
      return { missing, repeated, faltantes: missing, repetidas: repeated };
    }

    const [missingB64, repeatedB64] = parts;
    const missingBytes = base64ToUint8(missingB64);
    const repeatedBytes = base64ToUint8(repeatedB64);

    const missingDecompressed = pako.ungzip(missingBytes);
    const repeatedDecompressed = pako.ungzip(repeatedBytes);

    const sectionsOrder = getSectionsOrder(teamsList);

    // Decode missing bitfield using Little-Endian bits
    for (let globalBitIndex = 0; globalBitIndex < 1000; globalBitIndex++) {
      const byteIdx = Math.floor(globalBitIndex / 8);
      const bitIdx = globalBitIndex % 8;

      if (byteIdx < missingDecompressed.length) {
        const isSet = (missingDecompressed[byteIdx] & (1 << bitIdx)) !== 0;
        if (isSet) {
          const sectionIdx = Math.floor(globalBitIndex / 20);
          const internalBit = globalBitIndex % 20;
          const section = sectionsOrder[sectionIdx];
          if (section) {
            const number = section === 'FWC' ? internalBit : (internalBit + 1);
            missing.push({ section, number });
          }
        }
      }

      if (byteIdx < repeatedDecompressed.length) {
        const isSet = (repeatedDecompressed[byteIdx] & (1 << bitIdx)) !== 0;
        if (isSet) {
          const sectionIdx = Math.floor(globalBitIndex / 20);
          const internalBit = globalBitIndex % 20;
          const section = sectionsOrder[sectionIdx];
          if (section) {
            const number = section === 'FWC' ? internalBit : (internalBit + 1);
            repeated.push({ section, number });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to decode QR code to laminas:", err);
  }

  return { missing, repeated, faltantes: missing, repetidas: repeated };
}

/**
 * Decodes a QR code string back into missing and repeated status arrays.
 * Kept for full backward-compatibility with rest of application.
 */
export function decodeQRStringToStatus(
  qrString: string,
  cocaColaCount: number = 14,
  teamsList?: string[]
): {
  missingCodes: string[];
  repeatedCodes: string[];
} {
  const { missing, repeated } = decodeQRStringToLaminas(qrString, teamsList);
  return {
    missingCodes: missing.map(laminaToCode),
    repeatedCodes: repeated.map(laminaToCode)
  };
}

/**
 * Standard utility to convert Uint8Array to Base64 (compatible with standard JS/TS)
 */
function uint8ToBase64(arr: Uint8Array): string {
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

/**
 * Standard utility to convert Base64 back to Uint8Array
 */
function base64ToUint8(str: string): Uint8Array {
  const binary = atob(str);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

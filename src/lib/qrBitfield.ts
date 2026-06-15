import pako from 'pako';
import { TEAMS, SPECIALS } from '../constants';

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
 * Encodes the inventory into a compressed QR string:
 * ⋋~[String_Bits_Faltantes_Base64_GZIP];[String_Bits_Repetidas_Base64_GZIP]
 */
export function encodeInventoryToQRString(inventory: Record<string, any>, cocaColaCount: number = 14): string {
  const allCodes = getStickerCodesOrder(cocaColaCount);
  const missingBitfield = new Uint8Array(125); // 125 bytes = 1000 bits
  const repeatedBitfield = new Uint8Array(125);

  for (let i = 0; i < allCodes.length && i < 1000; i++) {
    const code = allCodes[i];
    const item = inventory[code];
    const count = item?.count || item?.quantity || 0;
    
    // Default system behaviour: if we don't have it (or count is 0 / status is missing) it's missing (bit set to 1)
    const isMissing = !item || item.status === 'missing' || count === 0;
    const isRepeated = item?.status === 'repeated' || count > 1;

    // Adjust Index to start at ID 1 for mathematical position formulas
    const id = i + 1;
    const byteIdx = Math.floor((id - 1) / 8);
    const bitIdx = (id - 1) % 8;

    if (isMissing) {
      missingBitfield[byteIdx] |= (1 << (7 - bitIdx));
    }
    if (isRepeated) {
      repeatedBitfield[byteIdx] |= (1 << (7 - bitIdx));
    }
  }

  // Compress using pako GZIP
  const missingCompressed = pako.gzip(missingBitfield);
  const repeatedCompressed = pako.gzip(repeatedBitfield);

  // Convert to base64
  const missingBase64 = uint8ToBase64(missingCompressed);
  const repeatedBase64 = uint8ToBase64(repeatedCompressed);

  return `⋋~${missingBase64};${repeatedBase64}`;
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
 * Decodes a QR code string back into missing and repeated status arrays
 * (Very useful for compatibility checks, testing, and full completeness!)
 */
export function decodeQRStringToStatus(qrString: string, cocaColaCount: number = 14): {
  missingCodes: string[];
  repeatedCodes: string[];
} {
  const missingCodes: string[] = [];
  const repeatedCodes: string[] = [];

  if (!qrString.startsWith('⋋~')) {
    return { missingCodes, repeatedCodes };
  }

  try {
    const parts = qrString.substring(2).split(';');
    if (parts.length !== 2) {
      return { missingCodes, repeatedCodes };
    }

    const [missingB64, repeatedB64] = parts;
    const missingBytes = base64ToUint8(missingB64);
    const repeatedBytes = base64ToUint8(repeatedB64);

    const missingDecompressed = pako.ungzip(missingBytes);
    const repeatedDecompressed = pako.ungzip(repeatedBytes);

    const allCodes = getStickerCodesOrder(cocaColaCount);

    for (let i = 0; i < allCodes.length && i < 1000; i++) {
      const id = i + 1;
      const byteIdx = Math.floor((id - 1) / 8);
      const bitIdx = (id - 1) % 8;

      if (byteIdx < missingDecompressed.length) {
        const isMissing = (missingDecompressed[byteIdx] & (1 << (7 - bitIdx))) !== 0;
        if (isMissing) {
          missingCodes.push(allCodes[i]);
        }
      }

      if (byteIdx < repeatedDecompressed.length) {
        const isRepeated = (repeatedDecompressed[byteIdx] & (1 << (7 - bitIdx))) !== 0;
        if (isRepeated) {
          repeatedCodes.push(allCodes[i]);
        }
      }
    }
  } catch (err) {
    console.error("Failed to decode QR code string:", err);
  }

  return { missingCodes, repeatedCodes };
}

function base64ToUint8(str: string): Uint8Array {
  const binary = atob(str);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

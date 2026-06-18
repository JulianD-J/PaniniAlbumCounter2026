/**
 * Mathematical deterministic offline handshake challenge-response algorithm.
 * Transforms a 3-digit challenge (000-999) into a 4-digit PIN response.
 * Works 100% locally and offline without pre-shared keys or synchronized clocks.
 */
export function computeHandshakeResponse(challenge: number): string {
  // Normalize challenge to fit 0-999
  const base = Math.max(0, Math.min(999, Math.floor(challenge || 0)));
  
  // Mathematical deterministic transformation:
  // Offset and multiplier are prime numbers to simulate a pseudo-random distribution
  const offset = 7349;
  const multiplier = 9181;
  const primeMod = 19997;
  const finalMod = 10000;
  
  // Non-linear combination
  const step1 = (base * base + offset) % primeMod;
  const step2 = (step1 * multiplier + 3571) % finalMod;
  
  return String(step2).padStart(4, '0');
}

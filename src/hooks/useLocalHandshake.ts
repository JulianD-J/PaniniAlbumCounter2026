import { useState, useCallback } from 'react';
import { computeHandshakeResponse } from '../lib/handshake';

export function useLocalHandshake() {
  // Receiver / Solicitante state
  const [challenge, setChallenge] = useState<number | null>(null);
  const [typedPin, setTypedPin] = useState("");
  const [isHandshakeVerified, setIsHandshakeVerified] = useState(false);
  const [handshakeError, setHandshakeError] = useState("");

  // Generate a random 3-digit challenge (100 to 999)
  const generateNewChallenge = useCallback(() => {
    const randomChallenge = Math.floor(100 + Math.random() * 900); // Between 100 and 999
    setChallenge(randomChallenge);
    setTypedPin("");
    setIsHandshakeVerified(false);
    setHandshakeError("");
    return randomChallenge;
  }, []);

  // Validate the entered PIN response against the challenge
  const verifyResponsePin = useCallback((pin: string) => {
    if (challenge === null) return false;
    const expectedPin = computeHandshakeResponse(challenge);
    const isValid = pin === expectedPin;
    setIsHandshakeVerified(isValid);
    if (!isValid && pin.length === 4) {
      setHandshakeError("PIN incorrecto. Verifica el trato con tu amigo.");
    } else {
      setHandshakeError("");
    }
    return isValid;
  }, [challenge]);

  // Reset handshake states
  const resetHandshake = useCallback(() => {
    setChallenge(null);
    setTypedPin("");
    setIsHandshakeVerified(false);
    setHandshakeError("");
  }, []);

  return {
    challenge,
    typedPin,
    setTypedPin,
    isHandshakeVerified,
    handshakeError,
    setHandshakeError,
    generateNewChallenge,
    verifyResponsePin,
    resetHandshake,
    computeResponse: computeHandshakeResponse // Expose the generator for the other side
  };
}
export { computeHandshakeResponse };

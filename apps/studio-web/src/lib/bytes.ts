/**
 * Small byte/hex helpers shared by identity, packages, and backup code.
 * Kept in one place so hex casing and validation rules cannot drift.
 */

const HEX = /^[0-9a-f]*$/;

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.toLowerCase();
  if (normalized.length % 2 !== 0 || !HEX.test(normalized)) {
    throw new Error('E-PACK-001 invalid hex string');
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Hex SHA-256 of raw bytes, lowercase — the digest form used in manifests. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const source = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', source.buffer as ArrayBuffer);
  return bytesToHex(new Uint8Array(digest));
}

/** SHA-256 of a UTF-8 string, lowercase hex. */
export async function sha256HexOfText(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text));
}

/**
 * Base32 (RFC 4648, no padding) rendering of a Site ID for display.
 */

export function siteIdBase32(siteId: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let buffer = 0;
  let bits = 0;
  let out = '';
  for (const byte of siteId) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(buffer >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    out += alphabet[(buffer << (5 - bits)) & 0x1f];
  }
  return out;
}

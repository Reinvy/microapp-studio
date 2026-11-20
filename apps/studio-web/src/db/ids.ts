/**
 * UUIDv7 generation (time-ordered) per RFC 9562.
 *
 * IDs are 36-char lowercase, monotonically sortable by creation time, and used
 * for every host table primary key (`data-model.md` §1).
 */

const HEX = '0123456789abcdef';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += HEX[(byte >> 4) & 0x0f] + HEX[byte & 0x0f];
  }
  return out;
}

/** Generate a UUIDv7 for `nowMs` (defaults to the current time). */
export function uuidv7(nowMs: number = Date.now()): string {
  const bytes = randomBytes(16);
  // 48-bit big-endian timestamp in milliseconds.
  bytes[0] = (nowMs / 2 ** 40) & 0xff;
  bytes[1] = (nowMs / 2 ** 32) & 0xff;
  bytes[2] = (nowMs / 2 ** 24) & 0xff;
  bytes[3] = (nowMs / 2 ** 16) & 0xff;
  bytes[4] = (nowMs / 2 ** 8) & 0xff;
  bytes[5] = nowMs & 0xff;
  // Version 7 + variant 10xx.
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuidv7(value: string): boolean {
  return UUID_RE.test(value);
}

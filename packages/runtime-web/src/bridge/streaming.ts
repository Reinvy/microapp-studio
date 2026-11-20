/**
 * Streaming and binary transfer verification (B-08, B-09).
 *
 * Frames are `{id, seq, chunk}` with a monotonic `seq` and a final
 * `{id, done:true}`. Binary transfers are chunked at 256 KiB and carry a
 * SHA-256 per file plus a total byte count; the receiver verifies both before
 * handing bytes to the micro-app.
 */

import { BridgeError } from './errors';
import { MAX_STREAM_CHUNK_BYTES, type StreamFrame } from './protocol';

export interface StreamState {
  readonly requestId: string;
  nextSeq: number;
  done: boolean;
  bytes: number;
  chunks: Uint8Array[];
}

export function openStream(requestId: string): StreamState {
  return { requestId, nextSeq: 0, done: false, bytes: 0, chunks: [] };
}

function chunkBytes(chunk: string | Uint8Array): Uint8Array {
  return typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
}

/** Validate one frame against the stream state and append its payload. */
export function acceptFrame(state: StreamState, frame: StreamFrame): StreamState {
  if (state.done) {
    throw new BridgeError('E-SBX-007', { reason: 'frame_after_done' });
  }
  if (!('done' in frame)) {
    if (frame.seq !== state.nextSeq) {
      throw new BridgeError('E-SBX-007', {
        reason: 'sequence_gap',
        expected: state.nextSeq,
        received: frame.seq,
      });
    }
    const bytes = chunkBytes(frame.chunk);
    if (bytes.byteLength > MAX_STREAM_CHUNK_BYTES) {
      throw new BridgeError('E-SBX-007', {
        reason: 'chunk_too_large',
        maxBytes: MAX_STREAM_CHUNK_BYTES,
      });
    }
    state.chunks.push(bytes);
    state.bytes += bytes.byteLength;
    state.nextSeq += 1;
    return state;
  }
  state.done = true;
  return state;
}

export function requireComplete(state: StreamState): void {
  if (!state.done) {
    throw new BridgeError('E-SBX-007', { reason: 'stream_incomplete' });
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface TransferDigest {
  totalBytes: number;
  sha256: string;
}

/**
 * Finish a stream and verify length + digest before the bytes are delivered.
 * Returns the assembled bytes only when both checks pass.
 */
export async function finishStream(
  state: StreamState,
  expected: TransferDigest,
): Promise<Uint8Array> {
  requireComplete(state);
  const bytes = concat(state.chunks);
  if (bytes.byteLength !== expected.totalBytes) {
    throw new BridgeError('E-SBX-007', {
      reason: 'size_mismatch',
      expected: expected.totalBytes,
      received: bytes.byteLength,
    });
  }
  const digest = await sha256Hex(bytes);
  if (digest !== expected.sha256.toLowerCase()) {
    throw new BridgeError('E-SBX-007', { reason: 'hash_mismatch' });
  }
  return bytes;
}

/** Split a payload into 256 KiB chunks and compute the digest the receiver checks. */
export async function chunkBinary(
  requestId: string,
  payload: Uint8Array,
): Promise<{ frames: StreamFrame[]; digest: TransferDigest }> {
  const frames: StreamFrame[] = [];
  for (let offset = 0, seq = 0; offset < payload.byteLength; offset += MAX_STREAM_CHUNK_BYTES, seq += 1) {
    frames.push({
      id: requestId,
      seq,
      chunk: payload.slice(offset, Math.min(offset + MAX_STREAM_CHUNK_BYTES, payload.byteLength)),
    });
  }
  frames.push({ id: requestId, done: true });
  return {
    frames,
    digest: { totalBytes: payload.byteLength, sha256: await sha256Hex(payload) },
  };
}

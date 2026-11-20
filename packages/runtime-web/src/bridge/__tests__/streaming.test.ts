import { describe, expect, it } from 'vitest';
import {
  acceptFrame,
  chunkBinary,
  finishStream,
  openStream,
  requireComplete,
} from '../streaming';
import { MAX_STREAM_CHUNK_BYTES } from '../protocol';
import { BridgeError } from '../errors';

function expectBridgeError(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BridgeError);
    expect((error as BridgeError).code).toBe(code);
    return;
  }
  throw new Error('expected BridgeError');
}

describe('streaming and binary transfer', () => {
  it('accepts ordered frames and completes', () => {
    const state = openStream('s1');
    acceptFrame(state, { id: 's1', seq: 0, chunk: 'a' });
    acceptFrame(state, { id: 's1', seq: 1, chunk: 'b' });
    expect(() => requireComplete(state)).toThrow();
    acceptFrame(state, { id: 's1', done: true });
    requireComplete(state);
    expect(state.bytes).toBe(2);
  });

  it('rejects sequence gaps and frames after done', () => {
    const gap = openStream('s2');
    expectBridgeError(() => acceptFrame(gap, { id: 's2', seq: 1, chunk: 'a' }), 'E-SBX-007');
    const done = openStream('s3');
    acceptFrame(done, { id: 's3', done: true });
    expectBridgeError(() => acceptFrame(done, { id: 's3', seq: 0, chunk: 'a' }), 'E-SBX-007');
  });

  it('rejects chunks above 256 KiB', () => {
    const state = openStream('s4');
    const oversized = new Uint8Array(MAX_STREAM_CHUNK_BYTES + 1);
    expectBridgeError(() => acceptFrame(state, { id: 's4', seq: 0, chunk: oversized }), 'E-SBX-007');
  });

  it('verifies size and digest before delivering bytes', async () => {
    const payload = new Uint8Array(MAX_STREAM_CHUNK_BYTES * 2 + 17);
    for (let index = 0; index < payload.length; index += 1) payload[index] = index % 251;
    const { frames, digest } = await chunkBinary('bin', payload);
    expect(frames).toHaveLength(4);
    expect(digest.totalBytes).toBe(payload.byteLength);

    const state = openStream('bin');
    for (const frame of frames) acceptFrame(state, frame);
    const assembled = await finishStream(state, digest);
    expect(assembled.byteLength).toBe(payload.byteLength);
    expect([...assembled.slice(0, 4)]).toEqual([...payload.slice(0, 4)]);

    // Wrong total size.
    const sizeState = openStream('bin');
    for (const frame of frames) acceptFrame(sizeState, frame);
    await expect(finishStream(sizeState, { ...digest, totalBytes: 1 })).rejects.toMatchObject({
      code: 'E-SBX-007',
    });

    // Wrong digest.
    const hashState = openStream('bin');
    for (const frame of frames) acceptFrame(hashState, frame);
    await expect(finishStream(hashState, { ...digest, sha256: 'deadbeef' })).rejects.toMatchObject({
      code: 'E-SBX-007',
    });
  });

  it('verifies that incomplete streams never deliver bytes', async () => {
    const state = openStream('incomplete');
    acceptFrame(state, { id: 'incomplete', seq: 0, chunk: 'a' });
    await expect(finishStream(state, { totalBytes: 1, sha256: 'x' })).rejects.toMatchObject({
      code: 'E-SBX-007',
    });
  });
});

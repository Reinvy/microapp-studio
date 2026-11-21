/**
 * Bridge rate limit: 30 calls per 10 seconds per app.
 *
 * Implemented as a token bucket with capacity 30 and a continuous refill of
 * 3 tokens per second, so a legitimate burst of 30 passes and the 31st call in
 * the same instant is rejected.
 */

export const RATE_LIMIT_CAPACITY = 30;
export const RATE_LIMIT_REFILL_PER_SECOND = 3;
export const RATE_LIMIT_REFILL_PER_MS = RATE_LIMIT_REFILL_PER_SECOND / 1000;

export class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    readonly capacity: number = RATE_LIMIT_CAPACITY,
    private readonly refillPerMs: number = RATE_LIMIT_REFILL_PER_MS,
    nowMs = 0,
  ) {
    this.tokens = capacity;
    this.lastRefillMs = nowMs;
  }

  /** Try to consume one token; returns false when the bucket is empty. */
  tryTake(nowMs: number): boolean {
    this.refill(nowMs);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  available(nowMs: number): number {
    this.refill(nowMs);
    return Math.floor(this.tokens);
  }

  private refill(nowMs: number): void {
    if (nowMs <= this.lastRefillMs) return;
    const elapsed = nowMs - this.lastRefillMs;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefillMs = nowMs;
  }
}

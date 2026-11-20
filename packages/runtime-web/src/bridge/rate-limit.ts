/**
 * Token bucket implementing the bridge rate limit (100 calls/second/app).
 *
 * The bucket refills continuously so a burst of 100 is allowed, the 101st call
 * inside the same second is rejected, and capacity recovers smoothly.
 */

export const RATE_LIMIT_PER_SECOND = 100;

export class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    readonly capacity: number = RATE_LIMIT_PER_SECOND,
    private readonly refillPerMs: number = RATE_LIMIT_PER_SECOND / 1000,
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

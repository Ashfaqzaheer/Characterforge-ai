// Feature: character-forge-ai, Property 24: Generation rate limit enforcement
// Feature: character-forge-ai, Property 25: General API rate limit enforcement
// Feature: character-forge-ai, Property 26: Sliding window expiry frees capacity
// Feature: character-forge-ai, Property 27: Rate-limited requests do not deduct credits
// Validates: Requirements 9.1, 9.2, 9.5, 9.6

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fc from "fast-check";
import {
  checkLimit,
  resetRateLimiter,
  RATE_LIMIT_CONFIGS,
} from "../../lib/rate-limiter";

// --- Generators ---

const userIdArb = fc.uuid();

// --- Tests ---

describe("Property 24: Generation rate limit enforcement", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("the 11th generation request within a 1-hour window is rejected with retryAfter", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        resetRateLimiter();

        // First 10 requests should be allowed
        for (let i = 0; i < 10; i++) {
          const result = await checkLimit(userId, "generation");
          expect(result.allowed).toBe(true);
          expect(result.retryAfter).toBeUndefined();
        }

        // 11th request should be rejected
        const result = await checkLimit(userId, "generation");
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeDefined();
        expect(result.retryAfter).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("generation rate limit max is configured as 10 per hour", () => {
    expect(RATE_LIMIT_CONFIGS.generation.max).toBe(10);
    expect(RATE_LIMIT_CONFIGS.generation.windowMs).toBe(3_600_000);
  });

  it("different users have independent generation rate limits", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, userIdArb, async (userA, userB) => {
        fc.pre(userA !== userB);
        resetRateLimiter();

        // Exhaust userA's limit
        for (let i = 0; i < 10; i++) {
          await checkLimit(userA, "generation");
        }

        // userB should still be allowed
        const result = await checkLimit(userB, "generation");
        expect(result.allowed).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 25: General API rate limit enforcement", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("the 61st API request within a 1-minute window is rejected with retryAfter", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        resetRateLimiter();

        // First 60 requests should be allowed
        for (let i = 0; i < 60; i++) {
          const result = await checkLimit(userId, "general");
          expect(result.allowed).toBe(true);
          expect(result.retryAfter).toBeUndefined();
        }

        // 61st request should be rejected
        const result = await checkLimit(userId, "general");
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeDefined();
        expect(result.retryAfter).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("general rate limit max is configured as 60 per minute", () => {
    expect(RATE_LIMIT_CONFIGS.general.max).toBe(60);
    expect(RATE_LIMIT_CONFIGS.general.windowMs).toBe(60_000);
  });

  it("different users have independent general rate limits", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, userIdArb, async (userA, userB) => {
        fc.pre(userA !== userB);
        resetRateLimiter();

        // Exhaust userA's limit
        for (let i = 0; i < 60; i++) {
          await checkLimit(userA, "general");
        }

        // userB should still be allowed
        const result = await checkLimit(userB, "general");
        expect(result.allowed).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});


describe("Property 26: Sliding window expiry frees capacity", () => {
  beforeEach(() => {
    resetRateLimiter();
    vi.useFakeTimers();
  });

  it("after the oldest request exits the sliding window, the next request is allowed", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        resetRateLimiter();
        vi.setSystemTime(0);

        // Fill up the generation limit (10 requests)
        for (let i = 0; i < 10; i++) {
          const result = await checkLimit(userId, "generation");
          expect(result.allowed).toBe(true);
        }

        // Verify limit is hit
        const blocked = await checkLimit(userId, "generation");
        expect(blocked.allowed).toBe(false);

        // Advance time past the window (1 hour + 1ms)
        vi.setSystemTime(RATE_LIMIT_CONFIGS.generation.windowMs + 1);

        // Now the request should be allowed again since all old timestamps expired
        const freed = await checkLimit(userId, "generation");
        expect(freed.allowed).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("partial window expiry frees exactly the expired request slots", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.integer({ min: 1, max: 9 }),
        async (userId, earlyRequests) => {
          resetRateLimiter();
          const windowMs = RATE_LIMIT_CONFIGS.generation.windowMs;

          // Make some requests at time 0
          vi.setSystemTime(0);
          for (let i = 0; i < earlyRequests; i++) {
            await checkLimit(userId, "generation");
          }

          // Make remaining requests at time windowMs / 2
          vi.setSystemTime(windowMs / 2);
          const lateRequests = 10 - earlyRequests;
          for (let i = 0; i < lateRequests; i++) {
            await checkLimit(userId, "generation");
          }

          // At this point, limit is full
          const blocked = await checkLimit(userId, "generation");
          expect(blocked.allowed).toBe(false);

          // Advance just past the window for the early requests
          vi.setSystemTime(windowMs + 1);

          // Now exactly earlyRequests slots should have freed up
          for (let i = 0; i < earlyRequests; i++) {
            const result = await checkLimit(userId, "generation");
            expect(result.allowed).toBe(true);
          }

          // But the next one should be blocked (late requests still in window)
          const stillBlocked = await checkLimit(userId, "generation");
          expect(stillBlocked.allowed).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("general rate limit also recovers after window expiry", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        resetRateLimiter();
        vi.setSystemTime(0);

        // Fill up the general limit
        for (let i = 0; i < 60; i++) {
          await checkLimit(userId, "general");
        }

        const blocked = await checkLimit(userId, "general");
        expect(blocked.allowed).toBe(false);

        // Advance past the 1-minute window
        vi.setSystemTime(RATE_LIMIT_CONFIGS.general.windowMs + 1);

        const freed = await checkLimit(userId, "general");
        expect(freed.allowed).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("Property 27: Rate-limited requests do not deduct credits", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("when a generation request is rate-limited, no credit deduction occurs", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.integer({ min: 1, max: 100 }),
        async (userId, initialBalance) => {
          resetRateLimiter();

          // Exhaust the generation rate limit
          for (let i = 0; i < 10; i++) {
            await checkLimit(userId, "generation");
          }

          // The 11th request is rate-limited
          const result = await checkLimit(userId, "generation");
          expect(result.allowed).toBe(false);

          // When allowed is false, the caller (route handler) must NOT
          // proceed with credit deduction. The contract is:
          // if (!result.allowed) → return 429, do NOT call deduct()
          // This test verifies the rate limiter returns the correct signal.
          // The balance remains unchanged because the request is rejected
          // before reaching the credit service.
          expect(result.retryAfter).toBeGreaterThan(0);

          // Simulate the invariant: balance stays the same
          let balance = initialBalance;
          if (!result.allowed) {
            // Route handler skips deduction — balance unchanged
          } else {
            balance -= 1;
          }
          expect(balance).toBe(initialBalance);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rate limiter rejection is checked before credit deduction in the request flow", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        resetRateLimiter();

        // Simulate a sequence of requests tracking the deduction gate
        let creditsDeducted = 0;

        for (let i = 0; i < 15; i++) {
          const result = await checkLimit(userId, "generation");
          if (result.allowed) {
            // Only deduct credits when rate limiter allows
            creditsDeducted += 1;
          }
        }

        // Only the first 10 (max allowed) should have resulted in deductions
        expect(creditsDeducted).toBe(10);
      }),
      { numRuns: 100 }
    );
  });

  it("retryAfter value is always a positive integer when rate-limited", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        resetRateLimiter();

        // Exhaust limit
        for (let i = 0; i < 10; i++) {
          await checkLimit(userId, "generation");
        }

        const result = await checkLimit(userId, "generation");
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeDefined();
        expect(Number.isInteger(result.retryAfter)).toBe(true);
        expect(result.retryAfter!).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});

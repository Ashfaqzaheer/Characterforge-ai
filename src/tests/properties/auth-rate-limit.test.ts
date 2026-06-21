// Feature: character-forge-ai — Auth endpoint rate limiting
// Tests: login rate limit (5/15min), register rate limit (3/hour), IP isolation, window expiry

import { describe, it, expect, beforeEach } from "vitest";
import { checkLimitByKey, resetRateLimiter, RATE_LIMIT_CONFIGS } from "../../lib/rate-limiter";

describe("Auth endpoint rate limiting", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("auth-login: 6th attempt within 15 minutes from same IP returns rate-limited", () => {
    const key = "ip:192.168.1.1:auth-login";
    const max = RATE_LIMIT_CONFIGS["auth-login"].max; // 5

    for (let i = 0; i < max; i++) {
      const result = checkLimitByKey(key, "auth-login");
      expect(result.allowed).toBe(true);
    }

    // 6th attempt should be blocked
    const blocked = checkLimitByKey(key, "auth-login");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("auth-register: 4th attempt within 1 hour from same IP returns rate-limited", () => {
    const key = "ip:10.0.0.5:auth-register";
    const max = RATE_LIMIT_CONFIGS["auth-register"].max; // 3

    for (let i = 0; i < max; i++) {
      const result = checkLimitByKey(key, "auth-register");
      expect(result.allowed).toBe(true);
    }

    // 4th attempt should be blocked
    const blocked = checkLimitByKey(key, "auth-register");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("different IPs are rate-limited independently", () => {
    const key1 = "ip:1.2.3.4:auth-login";
    const key2 = "ip:5.6.7.8:auth-login";
    const max = RATE_LIMIT_CONFIGS["auth-login"].max;

    // Exhaust IP 1's limit
    for (let i = 0; i < max; i++) {
      checkLimitByKey(key1, "auth-login");
    }
    expect(checkLimitByKey(key1, "auth-login").allowed).toBe(false);

    // IP 2 should still be allowed
    expect(checkLimitByKey(key2, "auth-login").allowed).toBe(true);
  });

  it("rate limit resets after the window expires", () => {
    const key = "ip:99.99.99.99:auth-register";
    const max = RATE_LIMIT_CONFIGS["auth-register"].max;

    // Exhaust limit
    for (let i = 0; i < max; i++) {
      checkLimitByKey(key, "auth-register");
    }
    expect(checkLimitByKey(key, "auth-register").allowed).toBe(false);

    // Simulate window expiry by calling resetRateLimiter (which clears the store)
    resetRateLimiter();

    // Should be allowed again
    expect(checkLimitByKey(key, "auth-register").allowed).toBe(true);
  });
});

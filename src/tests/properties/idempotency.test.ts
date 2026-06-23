// Feature: character-forge-ai — generation request idempotency key

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkAndSetKey,
  clearKey,
  resetIdempotencyStore,
} from "../../lib/idempotency";

describe("Idempotency key store", () => {
  beforeEach(() => {
    resetIdempotencyStore();
  });

  it("first call with a key returns false (not duplicate)", () => {
    expect(checkAndSetKey("key-1")).toBe(false);
  });

  it("second call with same key within TTL returns true (duplicate)", () => {
    checkAndSetKey("key-1");
    expect(checkAndSetKey("key-1")).toBe(true);
  });

  it("after clearKey(), same key returns false (can be reused)", () => {
    checkAndSetKey("key-1");
    clearKey("key-1");
    expect(checkAndSetKey("key-1")).toBe(false);
  });

  it("expired key is treated as absent (returns false)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    checkAndSetKey("key-1");
    expect(checkAndSetKey("key-1")).toBe(true); // still within TTL

    // Advance past TTL (30 seconds)
    vi.setSystemTime(31_000);

    expect(checkAndSetKey("key-1")).toBe(false); // expired, treated as new

    vi.useRealTimers();
  });

  it("different keys are independent", () => {
    checkAndSetKey("key-a");
    expect(checkAndSetKey("key-b")).toBe(false); // different key, not a duplicate
    expect(checkAndSetKey("key-a")).toBe(true); // same key, duplicate
  });

  it("sweep removes expired entries on each call", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    // Pre-populate with entries
    checkAndSetKey("old-1");
    checkAndSetKey("old-2");
    checkAndSetKey("old-3");

    // Advance past TTL
    vi.setSystemTime(31_000);

    // This call triggers sweep internally
    checkAndSetKey("new-key");

    // Old keys should be gone (treated as absent)
    expect(checkAndSetKey("old-1")).toBe(false);
    expect(checkAndSetKey("old-2")).toBe(false);
    expect(checkAndSetKey("old-3")).toBe(false);

    vi.useRealTimers();
  });
});

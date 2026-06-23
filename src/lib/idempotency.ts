/**
 * Short-lived idempotency key store for preventing duplicate generation requests.
 *
 * In-memory Map<key, expiryTimestamp>. Keys auto-expire after TTL_MS (30 seconds).
 * On each checkAndSetKey() call, expired entries are lazily evicted.
 *
 * SERVERLESS CAVEAT: This is in-memory and won't deduplicate across multiple server
 * instances (same limitation as the rate limiter). The rate limiter is the real backstop.
 * If cross-instance deduplication is needed, migrate to Upstash Redis (same upgrade path
 * as the rate limiter).
 */

const TTL_MS = 30_000; // 30 seconds
const MAX_ENTRIES = 10_000;

const store = new Map<string, number>();

/**
 * Sweeps expired entries from the store (lazy eviction).
 */
function sweep(): void {
  const now = Date.now();
  for (const [key, expiry] of store) {
    if (expiry <= now) {
      store.delete(key);
    }
  }
}

/**
 * Checks if a key is already active (duplicate request).
 * If not a duplicate, stores the key with a 30-second TTL.
 *
 * @returns true if duplicate (key already set and not expired), false otherwise.
 */
export function checkAndSetKey(key: string): boolean {
  // Lazy eviction of expired entries
  sweep();

  // Hard ceiling — fail open (skip idempotency) rather than block all requests
  if (store.size >= MAX_ENTRIES) {
    console.warn("[idempotency] Store reached max capacity, skipping deduplication check");
    return false;
  }

  const now = Date.now();
  const existing = store.get(key);

  if (existing !== undefined && existing > now) {
    // Key exists and hasn't expired → duplicate
    return true;
  }

  // Store key with TTL
  store.set(key, now + TTL_MS);
  return false;
}

/**
 * Removes a key from the store, allowing the same request to be retried immediately
 * (e.g. after a legitimate failure).
 */
export function clearKey(key: string): void {
  store.delete(key);
}

/**
 * Resets the entire store. For testing only.
 */
export function resetIdempotencyStore(): void {
  store.clear();
}

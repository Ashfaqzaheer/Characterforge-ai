/**
 * Sliding window rate limiter (in-memory).
 * Suitable for single-instance MVP deployment.
 * For production scale-out, migrate to Redis without API changes.
 */

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  generation: { windowMs: 3_600_000, max: 10 },       // 10 per hour
  general: { windowMs: 60_000, max: 60 },             // 60 per minute
  "auth-login": { windowMs: 900_000, max: 5 },        // 5 attempts per 15 min per IP
  "auth-register": { windowMs: 3_600_000, max: 3 },   // 3 registrations per hour per IP
};

// In-memory store: key → sorted array of timestamps
const store = new Map<string, number[]>();

function getKey(userId: string, endpoint: string): string {
  return `${userId}:${endpoint}`;
}

/**
 * Checks if a request is allowed under the sliding window rate limit.
 * Returns { allowed: true } if the request can proceed, or
 * { allowed: false, retryAfter: seconds } if the user is rate-limited.
 */
export function checkLimit(
  userId: string,
  endpoint: "generation" | "general"
): RateLimitResult {
  return checkLimitByKey(getKey(userId, endpoint), endpoint);
}

/**
 * General-purpose rate limit check keyed by an arbitrary identifier (e.g. IP address).
 * Used for unauthenticated endpoints like login/register where no userId is available.
 */
export function checkLimitByKey(
  key: string,
  endpoint: string
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[endpoint];
  if (!config) return { allowed: true };

  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = store.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.max) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + config.windowMs - now) / 1000);
    store.set(key, timestamps);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true };
}

/**
 * Resets the rate limiter store. Primarily for testing.
 */
export function resetRateLimiter(): void {
  store.clear();
}

/**
 * Exposes the configs for testing purposes.
 */
export { RATE_LIMIT_CONFIGS };

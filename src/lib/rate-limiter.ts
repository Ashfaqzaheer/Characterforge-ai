/**
 * Sliding window rate limiter.
 *
 * Backend:
 * - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set → Upstash Redis
 *   (sorted sets, survives across serverless instances).
 * - Otherwise → in-memory Map (suitable for single-instance / local dev / Docker demo).
 *
 * Both paths implement identical sliding-window semantics.
 */

import { Redis } from "@upstash/redis";

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

// --- Redis client (optional) ---

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const USE_REDIS = !!(UPSTASH_URL && UPSTASH_TOKEN);

const redis = USE_REDIS ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

// --- In-memory store (fallback) ---

const store = new Map<string, number[]>();

function getKey(userId: string, endpoint: string): string {
  return `${userId}:${endpoint}`;
}

// --- Public API ---

/**
 * Checks rate limit for an authenticated user.
 * Backward-compatible wrapper around checkLimitByKey.
 */
export async function checkLimit(
  userId: string,
  endpoint: "generation" | "general"
): Promise<RateLimitResult> {
  return checkLimitByKey(getKey(userId, endpoint), endpoint);
}

/**
 * General-purpose rate limit check keyed by an arbitrary identifier.
 * Routes to Redis or in-memory depending on configuration.
 */
export async function checkLimitByKey(
  key: string,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[endpoint];
  if (!config) return { allowed: true };

  if (USE_REDIS && redis) {
    return checkLimitRedis(key, config);
  }
  return checkLimitMemory(key, config);
}

// --- Redis implementation (sorted set sliding window) ---

async function checkLimitRedis(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const redisKey = `ratelimit:${key}`;

  // Pipeline: remove expired, count current, add new entry
  const pipeline = redis!.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zcard(redisKey);

  const results = await pipeline.exec();
  const count = results[1] as number;

  if (count >= config.max) {
    // Get the oldest entry to calculate retryAfter
    const oldest = await redis!.zrange<string[]>(redisKey, 0, 0);
    const oldestTs = oldest.length > 0 ? Number(oldest[0]) : now;
    const retryAfter = Math.ceil((oldestTs + config.windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
  }

  // Add current request timestamp (use timestamp as both score and member for uniqueness)
  const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
  await redis!.zadd(redisKey, { score: now, member });
  // Set TTL slightly beyond the window to auto-cleanup
  await redis!.expire(redisKey, Math.ceil(config.windowMs / 1000) + 10);

  return { allowed: true };
}

// --- In-memory implementation (unchanged sliding window) ---

function checkLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
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
 * Resets the rate limiter store. For testing only.
 * Only works for in-memory mode. In Redis mode this is a no-op
 * (tests should not set Upstash env vars).
 */
export function resetRateLimiter(): void {
  store.clear();
}

export { RATE_LIMIT_CONFIGS };

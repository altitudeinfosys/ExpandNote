/**
 * Simple in-memory rate limiter for AI execution endpoints
 *
 * WARNING: This implementation is suitable for development and low-traffic scenarios.
 * For production with multiple serverless instances, migrate to Redis-based solution
 * (e.g., Upstash Rate Limit) to ensure consistent rate limiting across instances.
 *
 * @see https://github.com/upstash/ratelimit for production-ready solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit tracking
const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a user has exceeded their rate limit
 *
 * @param userId - The unique user identifier
 * @param limit - Maximum number of requests allowed in the time window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns true if request should be allowed, false if rate limit exceeded
 */
export function checkRateLimit(
  userId: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  // No previous entry or window has expired - allow and create new entry
  if (!userLimit || userLimit.resetTime < now) {
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  // Exceeded limit - reject
  if (userLimit.count >= limit) {
    return false;
  }

  // Within limit - increment and allow
  userLimit.count++;
  return true;
}

/**
 * Get the current rate limit status for a user
 * Useful for returning headers like X-RateLimit-Remaining
 *
 * @param userId - The unique user identifier
 * @param limit - Maximum number of requests allowed
 * @returns Object with current count, limit, and reset time
 */
export function getRateLimitStatus(userId: string, limit: number = 10) {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || userLimit.resetTime < now) {
    return {
      current: 0,
      limit,
      remaining: limit,
      resetTime: now + 60000,
    };
  }

  return {
    current: userLimit.count,
    limit,
    remaining: Math.max(0, limit - userLimit.count),
    resetTime: userLimit.resetTime,
  };
}

/**
 * Reset rate limit for a specific user
 * Useful for testing or administrative overrides
 *
 * @param userId - The unique user identifier
 */
export function resetRateLimit(userId: string): void {
  rateLimitMap.delete(userId);
}

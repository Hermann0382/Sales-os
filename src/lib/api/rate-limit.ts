/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API endpoints
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (consider Redis for production scaling)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Prefix for the rate limit key (e.g., 'analytics', 'calls') */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (user ID, IP, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowSeconds, prefix = 'default' } = config;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = rateLimitStore.get(key);

  // If no entry exists or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Create rate limit headers for HTTP response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

// Default rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // Analytics endpoints - allow 60 requests per minute
  analytics: {
    maxRequests: 60,
    windowSeconds: 60,
    prefix: 'analytics',
  } as RateLimitConfig,

  // Heavy analytics (dashboard summary) - allow 20 requests per minute
  analyticsDashboard: {
    maxRequests: 20,
    windowSeconds: 60,
    prefix: 'analytics-dashboard',
  } as RateLimitConfig,

  // Standard API endpoints - allow 100 requests per minute
  standard: {
    maxRequests: 100,
    windowSeconds: 60,
    prefix: 'standard',
  } as RateLimitConfig,

  // Strict endpoints (e.g., exports) - allow 10 requests per minute
  strict: {
    maxRequests: 10,
    windowSeconds: 60,
    prefix: 'strict',
  } as RateLimitConfig,
} as const;

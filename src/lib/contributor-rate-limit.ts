/**
 * Simple in-memory rate limiter for contributor email verification.
 * Limits to 5 emails per IP per hour to prevent spam.
 *
 * Note: In a production environment with multiple instances,
 * consider using Redis for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const emailRateLimitMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

/**
 * Clean up expired entries periodically to prevent memory leaks.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of emailRateLimitMap.entries()) {
    if (entry.resetAt < now) {
      emailRateLimitMap.delete(key);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);

/**
 * Check if an IP is within rate limits for sending verification emails.
 *
 * @param ip - The IP address to check
 * @returns Object with `allowed` boolean and optional `resetAt` date when limit resets
 */
export function checkEmailRateLimit(ip: string): {
  allowed: boolean;
  resetAt?: Date;
} {
  const now = Date.now();
  const entry = emailRateLimitMap.get(ip);

  // No previous requests or window expired - allow and start new window
  if (!entry || entry.resetAt < now) {
    emailRateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  // Check if limit exceeded
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, resetAt: new Date(entry.resetAt) };
  }

  // Increment counter and allow
  entry.count++;
  return { allowed: true };
}

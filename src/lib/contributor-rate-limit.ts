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

// Rate limit maps for different actions
const emailRateLimitMap = new Map<string, RateLimitEntry>();
const ideaRateLimitMap = new Map<string, RateLimitEntry>();
const voteRateLimitMap = new Map<string, RateLimitEntry>();

// Email verification: 5 per hour (prevents email spam)
const EMAIL_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_MAX_REQUESTS = 5;

// Idea submission: 10 per hour (prevents idea spam)
const IDEA_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const IDEA_MAX_REQUESTS = 10;

// Voting: 60 per minute (allows rapid but prevents automation)
const VOTE_WINDOW_MS = 60 * 1000; // 1 minute
const VOTE_MAX_REQUESTS = 60;

// Legacy constants for backwards compatibility
const WINDOW_MS = EMAIL_WINDOW_MS;
const MAX_REQUESTS = EMAIL_MAX_REQUESTS;

/**
 * Clean up expired entries periodically to prevent memory leaks.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const maps = [emailRateLimitMap, ideaRateLimitMap, voteRateLimitMap];

  for (const map of maps) {
    for (const [key, entry] of map.entries()) {
      if (entry.resetAt < now) {
        map.delete(key);
      }
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

/**
 * Check if a contributor is within rate limits for submitting ideas.
 * Uses contributorId for accurate per-user limiting.
 *
 * @param contributorId - The contributor's unique ID
 * @returns Object with `allowed` boolean and optional `resetAt` date when limit resets
 */
export function checkIdeaRateLimit(contributorId: string): {
  allowed: boolean;
  resetAt?: Date;
} {
  const now = Date.now();
  const entry = ideaRateLimitMap.get(contributorId);

  // No previous requests or window expired - allow and start new window
  if (!entry || entry.resetAt < now) {
    ideaRateLimitMap.set(contributorId, {
      count: 1,
      resetAt: now + IDEA_WINDOW_MS,
    });
    return { allowed: true };
  }

  // Check if limit exceeded
  if (entry.count >= IDEA_MAX_REQUESTS) {
    return { allowed: false, resetAt: new Date(entry.resetAt) };
  }

  // Increment counter and allow
  entry.count++;
  return { allowed: true };
}

/**
 * Check if a contributor is within rate limits for voting.
 * Uses contributorId for accurate per-user limiting.
 *
 * @param contributorId - The contributor's unique ID
 * @returns Object with `allowed` boolean and optional `resetAt` date when limit resets
 */
export function checkVoteRateLimit(contributorId: string): {
  allowed: boolean;
  resetAt?: Date;
} {
  const now = Date.now();
  const entry = voteRateLimitMap.get(contributorId);

  // No previous requests or window expired - allow and start new window
  if (!entry || entry.resetAt < now) {
    voteRateLimitMap.set(contributorId, {
      count: 1,
      resetAt: now + VOTE_WINDOW_MS,
    });
    return { allowed: true };
  }

  // Check if limit exceeded
  if (entry.count >= VOTE_MAX_REQUESTS) {
    return { allowed: false, resetAt: new Date(entry.resetAt) };
  }

  // Increment counter and allow
  entry.count++;
  return { allowed: true };
}

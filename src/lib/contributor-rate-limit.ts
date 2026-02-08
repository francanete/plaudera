/**
 * Database-backed rate limiter for contributor actions.
 * Uses PostgreSQL upsert for atomic increment, works correctly on serverless.
 */

import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// Email verification: 5 per hour
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_MAX_REQUESTS = 5;

// Idea submission: 10 per hour
const IDEA_WINDOW_MS = 60 * 60 * 1000;
const IDEA_MAX_REQUESTS = 10;

// Voting: 60 per minute
const VOTE_WINDOW_MS = 60 * 1000;
const VOTE_MAX_REQUESTS = 60;

// Identify: 20 per minute per IP
const IDENTIFY_WINDOW_MS = 60 * 1000;
const IDENTIFY_MAX_REQUESTS = 20;

interface RateLimitResult {
  allowed: boolean;
  resetAt?: Date;
}

async function checkRateLimit(
  prefix: string,
  identifier: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const key = `${prefix}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    // Upsert: insert or increment, resetting window if expired
    const result = await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${rateLimits.windowStart} < ${windowStart} THEN 1 ELSE ${rateLimits.count} + 1 END`,
          windowStart: sql`CASE WHEN ${rateLimits.windowStart} < ${windowStart} THEN ${now} ELSE ${rateLimits.windowStart} END`,
        },
      })
      .returning({
        count: rateLimits.count,
        windowStart: rateLimits.windowStart,
      });

    const row = result[0];
    if (row.count > maxRequests) {
      const resetAt = new Date(row.windowStart.getTime() + windowMs);
      return { allowed: false, resetAt };
    }

    return { allowed: true };
  } catch (error) {
    console.error(`Rate limit check failed for ${prefix}:`, error);
    // Fail closed — block if DB is unreachable
    return { allowed: false, resetAt: new Date(now.getTime() + windowMs) };
  }
}

export function checkEmailRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit("email", ip, EMAIL_WINDOW_MS, EMAIL_MAX_REQUESTS);
}

export function checkIdeaRateLimit(
  contributorId: string
): Promise<RateLimitResult> {
  return checkRateLimit(
    "idea",
    contributorId,
    IDEA_WINDOW_MS,
    IDEA_MAX_REQUESTS
  );
}

export function checkVoteRateLimit(
  contributorId: string
): Promise<RateLimitResult> {
  return checkRateLimit(
    "vote",
    contributorId,
    VOTE_WINDOW_MS,
    VOTE_MAX_REQUESTS
  );
}

export function checkIdentifyRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(
    "identify",
    ip,
    IDENTIFY_WINDOW_MS,
    IDENTIFY_MAX_REQUESTS
  );
}

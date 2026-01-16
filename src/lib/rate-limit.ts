import "server-only";
import { db } from "./db";
import { aiUsage, featureRateLimits, Plan } from "./db/schema";
import { eq, gte, sql, and } from "drizzle-orm";

export type AIRateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
};

// Cache for AI limits per plan
const limitCache = new Map<
  string,
  { limit: number | null; expiresAt: number }
>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Clear the AI limit cache.
 * Call this after admin updates rate limits.
 */
export function clearAILimitCache(): void {
  limitCache.clear();
}

/**
 * Get the next day start (midnight UTC) for reset time
 */
function getNextDayStart(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow;
}

/**
 * Get today's start (midnight UTC) for window calculation
 */
function getTodayStart(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

/**
 * Get AI rate limit for a plan from the database.
 * Uses in-memory cache with 60s TTL.
 * DB is the single source of truth - seeded by seed-tiers.ts
 */
async function getAILimit(plan: string): Promise<number | null> {
  const cached = limitCache.get(plan);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.limit;
  }

  try {
    const config = await db.query.featureRateLimits.findFirst({
      where: and(
        eq(featureRateLimits.plan, plan as Plan),
        eq(featureRateLimits.isActive, true)
      ),
    });

    // DB is the source of truth - null means not configured or unlimited
    const limit = config?.requestsPerDay ?? null;

    limitCache.set(plan, {
      limit,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return limit;
  } catch (error) {
    console.error("Failed to fetch AI limit from DB:", error);
    // Fail open - allow request if database unavailable
    return null;
  }
}

/**
 * Count AI requests for a user today.
 */
async function countAIRequestsToday(userId: string): Promise<number> {
  const todayStart = getTodayStart();

  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, todayStart)));

  return result[0]?.count ?? 0;
}

/**
 * Check AI rate limit for a user.
 * Counts all AI requests (chat, summarize, generate) toward one daily limit.
 */
export async function checkAIRateLimit(
  userId: string,
  plan: string
): Promise<AIRateLimitResult> {
  try {
    const limit = await getAILimit(plan);

    // Unlimited plan
    if (limit === null) {
      return {
        success: true,
        remaining: Infinity,
        resetAt: getNextDayStart(),
        limit: Infinity,
      };
    }

    const count = await countAIRequestsToday(userId);

    if (count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetAt: getNextDayStart(),
        limit,
      };
    }

    return {
      success: true,
      remaining: Math.max(0, limit - count - 1), // -1 accounts for current request
      resetAt: getNextDayStart(),
      limit,
    };
  } catch (error) {
    console.error("AI rate limit check failed:", error);
    // Fail open - allow request if database unavailable
    return {
      success: true,
      remaining: 999,
      resetAt: getNextDayStart(),
      limit: 999,
    };
  }
}

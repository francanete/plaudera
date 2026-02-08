import "server-only";
import { db } from "./db";
import { aiUsage, Plan } from "./db/schema";
import { eq, gte, sql, and } from "drizzle-orm";
import { appConfig } from "./config";

export type AIRateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
};

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
 * Get AI rate limit for a plan from config.
 * Returns null for unlimited.
 */
function getAILimit(plan: string, feature: string = "chat"): number | null {
  const planLimits = appConfig.pricing.rateLimits[plan as Plan];
  if (!planLimits) return null;

  const featureLimits = planLimits[feature];
  if (!featureLimits) return null;

  return featureLimits.requestsPerDay;
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
  plan: string,
  feature: string = "chat"
): Promise<AIRateLimitResult> {
  try {
    const limit = getAILimit(plan, feature);

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
    // Fail closed - block request if database unavailable
    return {
      success: false,
      remaining: 0,
      resetAt: getNextDayStart(),
      limit: 0,
    };
  }
}

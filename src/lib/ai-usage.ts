import { db } from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";
import type { ModelName } from "@/lib/ai";
import { desc, eq, sql } from "drizzle-orm";

type AIFeature = "chat" | "summarize" | "generate";

type TrackingData = {
  userId: string;
  model: ModelName;
  feature: AIFeature;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason?: string;
  durationMs?: number;
};

/**
 * Track AI usage asynchronously (fire-and-forget)
 * Errors are logged but don't throw to avoid crashing user sessions
 */
export async function trackAIUsage(data: TrackingData): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      userId: data.userId,
      model: data.model,
      feature: data.feature,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      finishReason: data.finishReason ?? null,
      durationMs: data.durationMs ?? null,
    });
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.error("Failed to track AI usage:", error);
  }
}

/**
 * Get user's token usage for a given time period
 * Useful for analytics dashboards
 */
export async function getUserTokenUsage(
  userId: string,
  options?: {
    days?: number;
    feature?: AIFeature;
  }
) {
  const { days = 30, feature } = options ?? {};
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Base query for totals
    const totalsQuery = db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${aiUsage.totalTokens}), 0)`,
        totalPromptTokens: sql<number>`COALESCE(SUM(${aiUsage.promptTokens}), 0)`,
        totalCompletionTokens: sql<number>`COALESCE(SUM(${aiUsage.completionTokens}), 0)`,
        totalRequests: sql<number>`COUNT(*)`,
      })
      .from(aiUsage)
      .where(
        feature
          ? sql`${aiUsage.userId} = ${userId} AND ${aiUsage.createdAt} >= ${startDate} AND ${aiUsage.feature} = ${feature}`
          : sql`${aiUsage.userId} = ${userId} AND ${aiUsage.createdAt} >= ${startDate}`
      );

    // Breakdown by feature
    const breakdownQuery = db
      .select({
        feature: aiUsage.feature,
        tokens: sql<number>`COALESCE(SUM(${aiUsage.totalTokens}), 0)`,
        requests: sql<number>`COUNT(*)`,
      })
      .from(aiUsage)
      .where(
        sql`${aiUsage.userId} = ${userId} AND ${aiUsage.createdAt} >= ${startDate}`
      )
      .groupBy(aiUsage.feature);

    const [totals, breakdown] = await Promise.all([
      totalsQuery,
      breakdownQuery,
    ]);

    return {
      totalTokens: Number(totals[0]?.totalTokens ?? 0),
      totalPromptTokens: Number(totals[0]?.totalPromptTokens ?? 0),
      totalCompletionTokens: Number(totals[0]?.totalCompletionTokens ?? 0),
      totalRequests: Number(totals[0]?.totalRequests ?? 0),
      breakdown: breakdown.map((b) => ({
        feature: b.feature,
        tokens: Number(b.tokens),
        requests: Number(b.requests),
      })),
    };
  } catch (error) {
    console.error("Failed to get user token usage:", error);
    return {
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalRequests: 0,
      breakdown: [],
    };
  }
}

/**
 * Get recent AI usage history for a user
 * Useful for activity logs
 */
export async function getRecentAIUsage(userId: string, limit = 10) {
  try {
    return await db
      .select()
      .from(aiUsage)
      .where(eq(aiUsage.userId, userId))
      .orderBy(desc(aiUsage.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get recent AI usage:", error);
    return [];
  }
}

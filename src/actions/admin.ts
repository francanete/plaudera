"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { tierConfigs, featureRateLimits } from "@/lib/db/schema";
import { requireAdminAccess, AuthError } from "@/lib/dal";
import { clearAILimitCache } from "@/lib/rate-limit";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const updateRateLimitSchema = z.object({
  requestsPerDay: z.number().int().min(1).max(100000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function getTierConfigs() {
  try {
    await requireAdminAccess();

    const tiers = await db.query.tierConfigs.findMany({
      orderBy: asc(tierConfigs.sortOrder),
    });

    const limits = await db.query.featureRateLimits.findMany({
      orderBy: [asc(featureRateLimits.plan), asc(featureRateLimits.feature)],
    });

    return { success: true as const, tiers, limits };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}

export async function updateFeatureRateLimit(
  plan: string,
  feature: string,
  updates: z.infer<typeof updateRateLimitSchema>
) {
  try {
    await requireAdminAccess();

    // Validate inputs
    let validated;
    try {
      validated = updateRateLimitSchema.parse(updates);
    } catch {
      return {
        success: false,
        error: "Validation failed: rate limits must be >= 1",
      };
    }

    // Validate plan is valid
    if (!["FREE", "STARTER", "GROWTH", "SCALE"].includes(plan)) {
      return { success: false, error: "Invalid plan" };
    }

    await db
      .update(featureRateLimits)
      .set({ ...validated, updatedAt: new Date() })
      .where(
        and(
          eq(
            featureRateLimits.plan,
            plan as "FREE" | "STARTER" | "GROWTH" | "SCALE"
          ),
          eq(featureRateLimits.feature, feature)
        )
      );

    // Clear rate limit cache so changes take effect immediately
    clearAILimitCache();

    revalidatePath("/dashboard/admin/tiers");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

export async function addFeatureRateLimit(
  plan: string,
  feature: string,
  requestsPerDay: number | null
) {
  try {
    await requireAdminAccess();

    // Validate plan
    if (!["FREE", "STARTER", "GROWTH", "SCALE"].includes(plan)) {
      return { success: false, error: "Invalid plan" };
    }

    // Validate feature name
    if (!feature || feature.length < 2 || feature.length > 50) {
      return { success: false, error: "Feature name must be 2-50 characters" };
    }

    // Validate daily limit
    if (
      requestsPerDay !== null &&
      (requestsPerDay < 1 || requestsPerDay > 100000)
    ) {
      return { success: false, error: "Daily limit must be 1-100000 or null" };
    }

    await db.insert(featureRateLimits).values({
      plan: plan as "FREE" | "STARTER" | "GROWTH" | "SCALE",
      feature,
      requestsPerDay,
    });

    clearAILimitCache();
    revalidatePath("/dashboard/admin/tiers");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

export async function deleteFeatureRateLimit(plan: string, feature: string) {
  try {
    await requireAdminAccess();

    await db
      .delete(featureRateLimits)
      .where(
        and(
          eq(
            featureRateLimits.plan,
            plan as "FREE" | "STARTER" | "GROWTH" | "SCALE"
          ),
          eq(featureRateLimits.feature, feature)
        )
      );

    clearAILimitCache();
    revalidatePath("/dashboard/admin/tiers");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

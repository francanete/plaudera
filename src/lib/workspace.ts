import { cache } from "react";
import { db } from "./db";
import { workspaces, slugChangeHistory, type Workspace } from "./db/schema";
import { eq, and, gt, count } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  MAX_DAILY_SLUG_CHANGES,
  MAX_LIFETIME_SLUG_CHANGES,
  type SlugRateLimitResult,
} from "./slug-validation";

/**
 * Fetch a workspace by its public slug. Wrapped in React `cache()` so
 * multiple calls within the same server-render are deduplicated.
 */
export const getWorkspaceBySlug = cache(async (slug: string) => {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });
});

async function checkSlugChangeRateLimit(
  workspaceId: string
): Promise<SlugRateLimitResult> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dailyResult, lifetimeResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(slugChangeHistory)
      .where(
        and(
          eq(slugChangeHistory.workspaceId, workspaceId),
          gt(slugChangeHistory.changedAt, oneDayAgo)
        )
      ),
    db
      .select({ count: count() })
      .from(slugChangeHistory)
      .where(eq(slugChangeHistory.workspaceId, workspaceId)),
  ]);

  const dailyCount = dailyResult[0]?.count ?? 0;
  const lifetimeCount = lifetimeResult[0]?.count ?? 0;

  const dailyRemaining = Math.max(0, MAX_DAILY_SLUG_CHANGES - dailyCount);
  const lifetimeRemaining = Math.max(
    0,
    MAX_LIFETIME_SLUG_CHANGES - lifetimeCount
  );

  if (lifetimeRemaining <= 0) {
    return {
      allowed: false,
      error: "You have reached the maximum number of slug changes (10 total)",
      dailyRemaining,
      lifetimeRemaining,
    };
  }

  if (dailyRemaining <= 0) {
    return {
      allowed: false,
      error:
        "You can only change your slug 3 times per day. Try again tomorrow.",
      dailyRemaining,
      lifetimeRemaining,
    };
  }

  return { allowed: true, dailyRemaining, lifetimeRemaining };
}

/**
 * Generate a URL-safe slug from an email address.
 * Format: email-prefix + random 6-char suffix (e.g., "johndoe-x7k2m9")
 */
export function generateSlug(email: string): string {
  const prefix = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);

  const suffix = createId().slice(0, 8);

  return `${prefix}-${suffix}`;
}

/**
 * Create a default workspace for a new user.
 * Uses the user's name or email prefix for the workspace name.
 * Handles concurrent requests safely with onConflictDoNothing.
 */
export async function createUserWorkspace(
  userId: string,
  email: string,
  name?: string | null
): Promise<Workspace> {
  const workspaceName = name || email.split("@")[0];
  const slug = generateSlug(email);

  // Use onConflictDoNothing to handle race conditions safely
  await db
    .insert(workspaces)
    .values({
      name: `${workspaceName}'s Workspace`,
      slug,
      ownerId: userId,
    })
    .onConflictDoNothing();

  // Always fetch after (handles both insert and conflict cases)
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });

  if (!workspace) {
    throw new Error(
      `Failed to create or retrieve workspace for user ${userId}`
    );
  }

  return workspace;
}

/**
 * Get the user's primary workspace.
 * In MVP, each user has exactly one workspace.
 */
export async function getUserWorkspace(
  userId: string
): Promise<Workspace | null> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });

  return workspace || null;
}

export type UpdateSlugResult =
  | { success: true; slug: string }
  | { success: false; error: string };

/**
 * Update a workspace's slug with rate limiting and audit trail.
 */
export async function updateWorkspaceSlug(
  userId: string,
  newSlug: string
): Promise<UpdateSlugResult> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });

  if (!workspace) {
    return { success: false, error: "Workspace not found" };
  }

  if (workspace.slug === newSlug) {
    return { success: false, error: "New slug is the same as current slug" };
  }

  // Check rate limits
  const rateLimit = await checkSlugChangeRateLimit(workspace.id);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error! };
  }

  try {
    await db.transaction(async (tx) => {
      // Record the change in history
      await tx.insert(slugChangeHistory).values({
        workspaceId: workspace.id,
        oldSlug: workspace.slug,
        newSlug,
      });

      // Update slug - DB unique constraint (workspaces_slug_idx) protects against duplicates
      await tx
        .update(workspaces)
        .set({ slug: newSlug })
        .where(eq(workspaces.id, workspace.id));
    });

    return { success: true, slug: newSlug };
  } catch (error: unknown) {
    // PostgreSQL unique_violation error code
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return { success: false, error: "This slug is already taken" };
    }
    throw error;
  }
}

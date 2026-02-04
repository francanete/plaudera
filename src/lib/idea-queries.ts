import { eq, desc, and, or, inArray } from "drizzle-orm";
import { db, ideas, PUBLIC_VISIBLE_STATUSES } from "@/lib/db";

/**
 * Query public-visible ideas for a workspace.
 * Enforces two invariants:
 *   1. Only PUBLISHED ideas (+ contributor's own UNDER_REVIEW)
 *   2. Never includes roadmap items (roadmapStatus must be "NONE")
 *
 * Use this for: public board, embed widget, public API.
 */
export async function queryPublicIdeas(
  workspaceId: string,
  options?: { contributorId?: string; limit?: number }
) {
  const whereClause = options?.contributorId
    ? and(
        eq(ideas.workspaceId, workspaceId),
        eq(ideas.roadmapStatus, "NONE"),
        or(
          inArray(ideas.status, PUBLIC_VISIBLE_STATUSES),
          and(
            eq(ideas.status, "UNDER_REVIEW"),
            eq(ideas.contributorId, options.contributorId)
          )
        )
      )
    : and(
        eq(ideas.workspaceId, workspaceId),
        eq(ideas.roadmapStatus, "NONE"),
        inArray(ideas.status, PUBLIC_VISIBLE_STATUSES)
      );

  return db.query.ideas.findMany({
    where: whereClause,
    orderBy: [desc(ideas.voteCount), desc(ideas.createdAt)],
    ...(options?.limit ? { limit: options.limit } : {}),
  });
}

/**
 * Query ideas for the dashboard ideas page.
 * Excludes roadmap items — those belong on /dashboard/roadmap.
 */
export async function queryDashboardIdeas(workspaceId: string) {
  return db.query.ideas.findMany({
    where: and(
      eq(ideas.workspaceId, workspaceId),
      eq(ideas.roadmapStatus, "NONE")
    ),
    orderBy: [desc(ideas.createdAt)],
  });
}

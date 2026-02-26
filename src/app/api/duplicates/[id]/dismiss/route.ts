import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, duplicateSuggestions, dedupeEvents } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError, BadRequestError } from "@/lib/errors";

// POST /api/duplicates/[id]/dismiss - Dismiss a duplicate suggestion
export const POST = protectedApiRouteWrapper<{ id: string }>(
  async (_request, { session, params }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Fetch the suggestion
    const suggestion = await db.query.duplicateSuggestions.findFirst({
      where: and(
        eq(duplicateSuggestions.id, params.id),
        eq(duplicateSuggestions.workspaceId, workspace.id)
      ),
    });

    if (!suggestion) {
      throw new NotFoundError("Suggestion not found");
    }

    if (suggestion.status !== "PENDING") {
      throw new BadRequestError("Suggestion has already been processed");
    }

    // Mark as dismissed
    await db
      .update(duplicateSuggestions)
      .set({
        status: "DISMISSED",
        reviewedAt: new Date(),
      })
      .where(eq(duplicateSuggestions.id, params.id));

    // Fire-and-forget: record telemetry
    db.insert(dedupeEvents)
      .values({
        workspaceId: workspace.id,
        ideaId: suggestion.sourceIdeaId,
        relatedIdeaId: suggestion.duplicateIdeaId,
        eventType: "dashboard_dismissed",
        similarity: suggestion.similarity,
      })
      .catch((err) =>
        console.error("[dismiss] Failed to record telemetry:", err)
      );

    return NextResponse.json({ success: true });
  },
  { requirePaid: false }
);

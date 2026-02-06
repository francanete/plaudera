import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db, duplicateSuggestions } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError } from "@/lib/errors";

// GET /api/duplicates - List pending duplicate suggestions for user's workspace
export const GET = protectedApiRouteWrapper(
  async (_request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Fetch pending suggestions with both ideas
    const suggestions = await db.query.duplicateSuggestions.findMany({
      where: and(
        eq(duplicateSuggestions.workspaceId, workspace.id),
        eq(duplicateSuggestions.status, "PENDING")
      ),
      with: {
        sourceIdea: {
          columns: {
            id: true,
            title: true,
            description: true,
            status: true,
            roadmapStatus: true,
            voteCount: true,
            createdAt: true,
          },
        },
        duplicateIdea: {
          columns: {
            id: true,
            title: true,
            description: true,
            status: true,
            roadmapStatus: true,
            voteCount: true,
            createdAt: true,
          },
        },
      },
      orderBy: [desc(duplicateSuggestions.similarity)],
    });

    return NextResponse.json({ suggestions });
  },
  { requirePaid: false }
);

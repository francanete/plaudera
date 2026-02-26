import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { getPollById } from "@/lib/poll-queries";
import { linkResponseToIdea } from "@/lib/poll-updates";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { db, ideas } from "@/lib/db";

const linkSchema = z.object({
  linkedIdeaId: z.string().nullable(),
});

export const PATCH = protectedApiRouteWrapper<{
  id: string;
  responseId: string;
}>(
  async (request, { session, params }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    // Verify poll belongs to workspace
    const poll = await getPollById(params.id, workspace.id);
    if (!poll) throw new NotFoundError("Poll not found");

    const body = await request.json();
    const { linkedIdeaId } = linkSchema.parse(body);

    // Verify linked idea belongs to the same workspace
    if (linkedIdeaId) {
      const idea = await db.query.ideas.findFirst({
        where: and(
          eq(ideas.id, linkedIdeaId),
          eq(ideas.workspaceId, workspace.id)
        ),
        columns: { id: true },
      });
      if (!idea) throw new BadRequestError("Idea not found in this workspace");
    }

    const response = await linkResponseToIdea(
      params.responseId,
      params.id,
      linkedIdeaId
    );
    return NextResponse.json({ response });
  },
  { requirePaid: true }
);

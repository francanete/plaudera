import { NextResponse } from "next/server";
import { z } from "zod";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { getPollById } from "@/lib/poll-queries";
import { linkResponseToIdea } from "@/lib/poll-updates";
import { NotFoundError } from "@/lib/errors";

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

    const response = await linkResponseToIdea(
      params.responseId,
      params.id,
      linkedIdeaId
    );
    return NextResponse.json({ response });
  },
  { requirePaid: true }
);

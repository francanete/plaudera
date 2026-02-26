import { NextResponse } from "next/server";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { getPollById, getPollResponses } from "@/lib/poll-queries";
import { NotFoundError } from "@/lib/errors";

export const GET = protectedApiRouteWrapper<{ id: string }>(
  async (_request, { session, params }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const poll = await getPollById(params.id, workspace.id);
    if (!poll) throw new NotFoundError("Poll not found");

    const responses = await getPollResponses(params.id);

    return NextResponse.json({ poll, responses });
  },
  { requirePaid: true }
);

import { NextResponse } from "next/server";
import { z } from "zod";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { activatePoll, closePoll } from "@/lib/poll-updates";
import { getPollById } from "@/lib/poll-queries";
import { NotFoundError } from "@/lib/errors";

const updatePollSchema = z.object({
  action: z.enum(["activate", "close"]),
});

export const GET = protectedApiRouteWrapper<{ id: string }>(
  async (_request, { session, params }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const poll = await getPollById(params.id, workspace.id);
    if (!poll) throw new NotFoundError("Poll not found");

    return NextResponse.json({ poll });
  },
  { requirePaid: true }
);

export const PATCH = protectedApiRouteWrapper<{ id: string }>(
  async (request, { session, params }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const body = await request.json();
    const { action } = updatePollSchema.parse(body);

    let poll;
    if (action === "activate") {
      poll = await activatePoll(params.id, workspace.id);
    } else {
      poll = await closePoll(params.id, workspace.id);
    }

    return NextResponse.json({ poll });
  },
  { requirePaid: true }
);

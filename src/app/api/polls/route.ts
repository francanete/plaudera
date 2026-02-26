import { NextResponse } from "next/server";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { listWorkspacePolls } from "@/lib/poll-queries";
import { createPoll, createPollSchema } from "@/lib/poll-updates";
import { NotFoundError } from "@/lib/errors";

export const GET = protectedApiRouteWrapper(
  async (_request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const polls = await listWorkspacePolls(workspace.id);
    return NextResponse.json({ polls });
  },
  { requirePaid: true }
);

export const POST = protectedApiRouteWrapper(
  async (request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) throw new NotFoundError("Workspace not found");

    const body = await request.json();
    const data = createPollSchema.parse(body);
    const poll = await createPoll(workspace.id, data);

    return NextResponse.json({ poll }, { status: 201 });
  },
  { requirePaid: true }
);

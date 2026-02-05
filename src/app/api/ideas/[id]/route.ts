import { NextResponse } from "next/server";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { toDashboardIdea } from "@/lib/api-utils";
import {
  getIdeaWithOwnerCheck,
  updateIdea,
  updateIdeaSchema,
  deleteIdea,
} from "@/lib/idea-updates";

type RouteParams = { id: string };

// GET /api/ideas/[id] - Get a single idea
export const GET = protectedApiRouteWrapper<RouteParams>(
  async (_request, { session, params }) => {
    const idea = await getIdeaWithOwnerCheck(params.id, session.user.id);

    return NextResponse.json({ idea: toDashboardIdea(idea) });
  },
  { requirePaid: false }
);

// PATCH /api/ideas/[id] - Update an idea
export const PATCH = protectedApiRouteWrapper<RouteParams>(
  async (request, { session, params }) => {
    const body = await request.json();
    const data = updateIdeaSchema.parse(body);

    const updatedIdea = await updateIdea(params.id, session.user.id, data);

    return NextResponse.json({ idea: toDashboardIdea(updatedIdea) });
  },
  { requirePaid: false }
);

// DELETE /api/ideas/[id] - Soft-delete an idea (set status to DECLINED)
export const DELETE = protectedApiRouteWrapper<RouteParams>(
  async (_request, { session, params }) => {
    await deleteIdea(params.id, session.user.id);

    return NextResponse.json({ success: true });
  },
  { requirePaid: false }
);

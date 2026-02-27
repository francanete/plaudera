import { NextResponse } from "next/server";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { toDashboardIdea } from "@/lib/api-utils";
import {
  getIdeaWithOwnerCheck,
  updateIdea,
  updateIdeaSchema,
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

// DELETE /api/ideas/[id] - Retired. Use PATCH with status: DECLINED.
export const DELETE = protectedApiRouteWrapper<RouteParams>(
  async () => {
    return NextResponse.json(
      {
        error:
          "DELETE is retired. Use PATCH with status: DECLINED and rationale.",
      },
      { status: 410 }
    );
  },
  { requirePaid: false }
);

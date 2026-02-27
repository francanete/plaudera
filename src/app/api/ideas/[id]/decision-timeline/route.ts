import { NextResponse } from "next/server";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getIdeaWithOwnerCheck } from "@/lib/idea-updates";
import { queryDecisionTimeline } from "@/lib/idea-queries";

type RouteParams = { id: string };

// GET /api/ideas/[id]/decision-timeline
export const GET = protectedApiRouteWrapper<RouteParams>(
  async (_request, { session, params }) => {
    await getIdeaWithOwnerCheck(params.id, session.user.id);

    const entries = await queryDecisionTimeline(params.id);

    return NextResponse.json({
      entries: entries.map((e) => ({
        ...e,
        createdAt: new Date(e.createdAt).toISOString(),
      })),
    });
  },
  { requirePaid: false }
);

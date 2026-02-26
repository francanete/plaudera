import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { getActivePoll } from "@/lib/poll-queries";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError } from "@/lib/errors";
import {
  getWorkspaceCorsHeaders,
  applyWorkspaceCorsHeaders,
} from "@/lib/cors";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export async function OPTIONS(request: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;
  const origin = request.headers.get("origin");
  const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, OPTIONS");
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) throw new NotFoundError("Workspace not found");

    const activePoll = await getActivePoll(workspaceId);

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, OPTIONS");

    return NextResponse.json(
      {
        poll: activePoll
          ? { id: activePoll.id, question: activePoll.question }
          : null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const { workspaceId } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    await applyWorkspaceCorsHeaders(errorResponse, origin, workspaceId, "GET, OPTIONS");
    return errorResponse;
  }
}

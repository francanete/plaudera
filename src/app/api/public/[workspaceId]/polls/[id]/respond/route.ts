import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import {
  getContributor,
  hasContributorWorkspaceMembership,
} from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { submitPollResponse } from "@/lib/poll-updates";
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/errors";
import { validateRequestOrigin } from "@/lib/csrf";
import {
  getWorkspaceCorsHeaders,
  applyWorkspaceCorsHeaders,
} from "@/lib/cors";

const respondSchema = z.object({
  response: z.string().min(1, "Response is required").max(700, "Response too long"),
});

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export async function OPTIONS(request: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;
  const origin = request.headers.get("origin");
  const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "POST, OPTIONS");
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, id: pollId } = await params;

    // CSRF protection
    const csrfResult = await validateRequestOrigin(request, workspaceId);
    if (!csrfResult.valid) {
      throw new ForbiddenError("Request origin not allowed");
    }

    // Contributor auth
    const contributor = await getContributor();
    if (!contributor) {
      throw new UnauthorizedError("Please verify your email to respond");
    }

    const hasMembership = await hasContributorWorkspaceMembership(
      contributor.id,
      workspaceId
    );
    if (!hasMembership) {
      throw new ForbiddenError("Please verify your email for this workspace");
    }

    // Verify workspace exists
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new NotFoundError("Workspace not found");

    const body = await request.json();
    const { response } = respondSchema.parse(body);

    const pollResponse = await submitPollResponse(pollId, contributor.id, response, workspaceId);

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceCorsHeaders(origin, workspaceId, "POST, OPTIONS");

    return NextResponse.json(
      { response: { id: pollResponse.id } },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    const { workspaceId } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    await applyWorkspaceCorsHeaders(errorResponse, origin, workspaceId, "POST, OPTIONS");
    return errorResponse;
  }
}

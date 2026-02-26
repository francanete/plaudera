import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, dedupeEvents, ideas } from "@/lib/db";
import { getWorkspaceCorsHeaders } from "@/lib/cors";
import { validateRequestOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/api-utils";

const dedupeEventSchema = z.object({
  eventType: z.enum(["accepted", "dismissed"]),
  relatedIdeaId: z.string().min(1),
  similarity: z.number().int().min(0).max(100).optional(),
});

type RouteParams = {
  params: Promise<{ workspaceId: string; id: string }>;
};

export async function OPTIONS(request: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;
  const origin = request.headers.get("origin");
  const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "POST, OPTIONS");
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, id: ideaId } = await params;

    const csrfResult = await validateRequestOrigin(request, workspaceId);
    if (!csrfResult.valid) {
      const origin = request.headers.get("origin");
      const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "POST, OPTIONS");
      return NextResponse.json(
        { error: csrfResult.reason },
        { status: 403, headers }
      );
    }

    const idea = await db.query.ideas.findFirst({
      where: and(eq(ideas.id, ideaId), eq(ideas.workspaceId, workspaceId)),
      columns: { id: true },
    });

    if (!idea) {
      const origin = request.headers.get("origin");
      const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "POST, OPTIONS");
      return NextResponse.json(
        { error: "Idea not found" },
        { status: 404, headers }
      );
    }

    const body = await request.json();
    const data = dedupeEventSchema.parse(body);

    await db.insert(dedupeEvents).values({
      workspaceId,
      ideaId,
      relatedIdeaId: data.relatedIdeaId,
      eventType: data.eventType,
      similarity: data.similarity ?? null,
    });

    const origin = request.headers.get("origin");
    const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "POST, OPTIONS");
    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    const { workspaceId } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "POST, OPTIONS");
    Object.entries(headers).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }
}

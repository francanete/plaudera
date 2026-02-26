import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ideaEmbeddings, ideas, dedupeEvents } from "@/lib/db";
import { findSimilarToIdea } from "@/lib/ai/similarity";
import { getWorkspaceCorsHeaders } from "@/lib/cors";
import { handleApiError } from "@/lib/api-utils";

type RouteParams = {
  params: Promise<{ workspaceId: string; id: string }>;
};

export async function OPTIONS(request: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;
  const origin = request.headers.get("origin");
  const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, OPTIONS");
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId, id: ideaId } = await params;

    // Validate idea belongs to this workspace
    const idea = await db.query.ideas.findFirst({
      where: and(eq(ideas.id, ideaId), eq(ideas.workspaceId, workspaceId)),
      columns: { id: true },
    });

    if (!idea) {
      const origin = request.headers.get("origin");
      const headers = await getWorkspaceCorsHeaders(origin, workspaceId);
      return NextResponse.json(
        { error: "Idea not found" },
        { status: 404, headers }
      );
    }

    // Check if embedding exists for this idea
    const embedding = await db.query.ideaEmbeddings.findFirst({
      where: eq(ideaEmbeddings.ideaId, ideaId),
      columns: { id: true },
    });

    if (!embedding) {
      const origin = request.headers.get("origin");
      const headers = await getWorkspaceCorsHeaders(origin, workspaceId);
      return NextResponse.json(
        { status: "pending", similarIdeas: [] },
        { headers }
      );
    }

    const similarIdeas = await findSimilarToIdea(ideaId, workspaceId, 3);

    // Fire-and-forget: record "shown" telemetry if results found
    if (similarIdeas.length > 0) {
      Promise.all(
        similarIdeas.map((similar) =>
          db.insert(dedupeEvents).values({
            workspaceId,
            ideaId,
            relatedIdeaId: similar.ideaId,
            eventType: "shown",
            similarity: similar.similarity,
          })
        )
      ).catch((err) =>
        console.error("[similar] Failed to record shown events:", err)
      );
    }

    const origin = request.headers.get("origin");
    const headers = await getWorkspaceCorsHeaders(origin, workspaceId);
    return NextResponse.json(
      { status: "ready", similarIdeas },
      { headers }
    );
  } catch (error) {
    const { workspaceId } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    const headers = await getWorkspaceCorsHeaders(origin, workspaceId);
    Object.entries(headers).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }
}

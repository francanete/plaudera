import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError } from "@/lib/errors";
import {
  getWorkspaceCorsHeaders,
  applyWorkspaceCorsHeaders,
} from "@/lib/cors";

type RouteParams = { params: Promise<{ workspaceId: string }> };

/**
 * OPTIONS /api/public/[workspaceId]/settings
 * Handle CORS preflight requests for widget embed
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: RouteParams
) {
  const { workspaceId } = await params;
  const origin = request.headers.get("origin");
  const headers = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, OPTIONS");
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * GET /api/public/[workspaceId]/settings
 * Get widget settings for a workspace (public)
 * Used by widget.js to fetch configuration at runtime
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      with: {
        widgetSettings: true,
      },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceCorsHeaders(origin, workspaceId, "GET, OPTIONS");
    // Return settings (default to bottom-right if no settings exist yet)
    return NextResponse.json(
      {
        position: workspace.widgetSettings?.position ?? "bottom-right",
        pageRules: workspace.widgetSettings?.pageRules ?? [],
        showLabel: workspace.widgetSettings?.showLabel ?? true,
        name: workspace.name,
        description: workspace.description,
        slug: workspace.slug,
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

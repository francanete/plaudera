import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError } from "@/lib/errors";
import {
  getWorkspaceSlugCorsHeaders,
  applyWorkspaceSlugCorsHeaders,
} from "@/lib/cors";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * OPTIONS /api/public/[slug]/settings
 * Handle CORS preflight requests for widget embed
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: RouteParams
) {
  const { slug } = await params;
  const origin = request.headers.get("origin");
  const headers = await getWorkspaceSlugCorsHeaders(origin, slug, "GET, OPTIONS");
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

/**
 * GET /api/public/[slug]/settings
 * Get widget settings for a workspace (public)
 * Used by widget.js to fetch configuration at runtime
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Find the workspace with its widget settings (check both current and previous slug)
    const workspace = await db.query.workspaces.findFirst({
      where: or(eq(workspaces.slug, slug), eq(workspaces.previousSlug, slug)),
      with: {
        widgetSettings: true,
      },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const origin = request.headers.get("origin");
    const corsHeaders = await getWorkspaceSlugCorsHeaders(origin, slug, "GET, OPTIONS");
    // Return settings (default to bottom-right if no settings exist yet)
    return NextResponse.json(
      {
        position: workspace.widgetSettings?.position ?? "bottom-right",
        pageRules: workspace.widgetSettings?.pageRules ?? [],
        showLabel: workspace.widgetSettings?.showLabel ?? true,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const { slug } = await params;
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    // Add CORS headers to error responses for widget compatibility
    await applyWorkspaceSlugCorsHeaders(errorResponse, origin, slug, "GET, OPTIONS");
    return errorResponse;
  }
}

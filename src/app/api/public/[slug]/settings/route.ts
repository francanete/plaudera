import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/api-utils";
import { NotFoundError } from "@/lib/errors";

// CORS headers for widget embed
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * OPTIONS /api/public/[slug]/settings
 * Handle CORS preflight requests for widget embed
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/public/[slug]/settings
 * Get widget settings for a workspace (public)
 * Used by widget.js to fetch configuration at runtime
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Find the workspace with its widget settings
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
      with: {
        widgetSettings: true,
      },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Return settings (default to bottom-right if no settings exist yet)
    return NextResponse.json(
      {
        position: workspace.widgetSettings?.position ?? "bottom-right",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const errorResponse = handleApiError(error);
    // Add CORS headers to error responses for widget compatibility
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }
}

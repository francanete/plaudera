import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { contributors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setContributorCookie } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { RateLimitError } from "@/lib/errors";
import { checkIdentifyRateLimit } from "@/lib/contributor-rate-limit";
import { isWorkspaceOriginAllowed, getWorkspaceCorsHeaders } from "@/lib/cors";

const identifySchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

/**
 * OPTIONS /api/contributor/identify
 * Handle CORS preflight requests.
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Permissive preflight — actual origin validation happens in POST
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    },
  });
}

/**
 * POST /api/contributor/identify
 *
 * Trusted identify endpoint: creates or finds a contributor based on email,
 * sets the auth cookie, and returns the contributor data.
 *
 * Security: Only allowed from origins in the workspace's CORS allowlist.
 * This enables workspace owners to skip the email verification dialog
 * for users they have already authenticated on their own site.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = checkIdentifyRateLimit(ip);

    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        "Too many identify requests. Please try again later.",
        rateLimitResult.resetAt!,
        0
      );
    }

    const body = await request.json();
    const { email, name, workspaceId } = identifySchema.parse(body);

    // Validate that the requesting origin is in this workspace's allowlist
    const originAllowed = await isWorkspaceOriginAllowed(origin, workspaceId);
    if (!originAllowed) {
      const corsHeaders = await getWorkspaceCorsHeaders(
        origin,
        workspaceId,
        "POST, OPTIONS"
      );
      return NextResponse.json(
        { error: "Origin not allowed for this workspace" },
        { status: 403, headers: corsHeaders }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create or find the contributor
    let contributor = await db.query.contributors.findFirst({
      where: eq(contributors.email, normalizedEmail),
    });

    if (!contributor) {
      const [newContributor] = await db
        .insert(contributors)
        .values({
          email: normalizedEmail,
          name: name || null,
        })
        .returning();
      contributor = newContributor;
    } else if (name && !contributor.name) {
      // Update name if provided and contributor doesn't have one
      const [updated] = await db
        .update(contributors)
        .set({ name })
        .where(eq(contributors.id, contributor.id))
        .returning();
      contributor = updated;
    }

    // Set the auth cookie
    await setContributorCookie(contributor);

    const corsHeaders = await getWorkspaceCorsHeaders(
      origin,
      workspaceId,
      "POST, OPTIONS"
    );

    return NextResponse.json(
      {
        contributor: {
          id: contributor.id,
          email: contributor.email,
          name: contributor.name,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const errorResponse = handleApiError(error);

    // Apply CORS headers to error responses too
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : null;
    const isAllowed =
      origin === appOrigin ||
      (process.env.NODE_ENV === "development" &&
        origin?.startsWith("http://localhost"));

    errorResponse.headers.set(
      "Access-Control-Allow-Origin",
      isAllowed && origin ? origin : "null"
    );
    errorResponse.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");
    errorResponse.headers.set("Access-Control-Allow-Credentials", "true");
    errorResponse.headers.set("Vary", "Origin");

    return errorResponse;
  }
}

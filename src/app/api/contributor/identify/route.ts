import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { contributors } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import {
  ensureContributorWorkspaceMembership,
  setContributorCookie,
} from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { RateLimitError } from "@/lib/errors";
import { checkIdentifyRateLimit } from "@/lib/contributor-rate-limit";
import {
  isWorkspaceConfiguredOriginAllowed,
  getWorkspaceCorsHeaders,
  getBaseAllowedOrigins,
} from "@/lib/cors";

const identifySchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  callerOrigin: z.string().url("Invalid caller origin").optional(),
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

  let workspaceId: string | null = null;

  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await checkIdentifyRateLimit(ip);

    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        "Too many identify requests. Please try again later.",
        rateLimitResult.resetAt!,
        0
      );
    }

    const body = await request.json();

    // Extract raw workspaceId before validation so it's available in catch block
    if (
      body &&
      typeof body === "object" &&
      typeof body.workspaceId === "string"
    ) {
      workspaceId = body.workspaceId;
    }

    const {
      email,
      name,
      workspaceId: validatedWsId,
      callerOrigin,
    } = identifySchema.parse(body);
    workspaceId = validatedWsId;

    // Validate that the requesting origin is in this workspace's allowlist
    const originAllowed = await isWorkspaceConfiguredOriginAllowed(
      origin,
      validatedWsId
    );
    if (!originAllowed) {
      const corsHeaders = await getWorkspaceCorsHeaders(
        origin,
        validatedWsId,
        "POST, OPTIONS"
      );
      return NextResponse.json(
        { error: "Origin not allowed for this workspace" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Validate callerOrigin against workspace allowlist if provided
    if (callerOrigin) {
      const callerAllowed = await isWorkspaceConfiguredOriginAllowed(
        callerOrigin,
        validatedWsId
      );
      if (!callerAllowed) {
        const corsHeaders = await getWorkspaceCorsHeaders(
          origin,
          validatedWsId,
          "POST, OPTIONS"
        );
        return NextResponse.json(
          { error: "Caller origin not allowed for this workspace" },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create or find the contributor (upsert to avoid race conditions
    // between concurrent identify calls for the same email)
    const [contributor] = await db
      .insert(contributors)
      .values({
        email: normalizedEmail,
        name: name || null,
      })
      .onConflictDoUpdate({
        target: contributors.email,
        set: {
          // Only update name if the caller provided one and the existing row has none
          name: name
            ? sql`COALESCE(${contributors.name}, ${name})`
            : sql`${contributors.name}`,
        },
      })
      .returning();

    // Set the auth cookie
    await ensureContributorWorkspaceMembership(contributor.id, validatedWsId);
    await setContributorCookie(contributor);

    const corsHeaders = await getWorkspaceCorsHeaders(
      origin,
      validatedWsId,
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

    // Apply workspace-aware CORS headers to error responses
    try {
      let corsHeaders: Record<string, string>;

      if (workspaceId) {
        // Use the full workspace allowlist for proper CORS on errors
        corsHeaders = await getWorkspaceCorsHeaders(
          origin,
          workspaceId,
          "POST, OPTIONS"
        );
      } else {
        // No workspaceId available (e.g. body parse failed) — fall back to base origins
        const baseOrigins = getBaseAllowedOrigins();
        const normalizedOrigin = origin ? origin : null;
        const isAllowed = normalizedOrigin
          ? baseOrigins.includes(normalizedOrigin)
          : false;

        corsHeaders = {
          "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Credentials": "true",
          Vary: "Origin",
        };
      }

      for (const [key, value] of Object.entries(corsHeaders)) {
        errorResponse.headers.set(key, value);
      }
    } catch {
      // If CORS header generation itself fails (e.g. DB error), apply safe defaults
      errorResponse.headers.set("Access-Control-Allow-Origin", "null");
      errorResponse.headers.set(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
      );
      errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");
      errorResponse.headers.set("Access-Control-Allow-Credentials", "true");
      errorResponse.headers.set("Vary", "Origin");
    }

    return errorResponse;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail, verifyToken } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { BadRequestError, RateLimitError } from "@/lib/errors";
import { checkEmailRateLimit } from "@/lib/contributor-rate-limit";
import { getWorkspaceSlugCorsHeaders } from "@/lib/cors";

/**
 * Extract workspace slug from a callback URL like "/b/{slug}" or "/b/{slug}?params"
 */
function extractWorkspaceSlug(callbackUrl: string): string | null {
  const match = callbackUrl.match(/^\/b\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * OPTIONS /api/contributor/verify
 * Handle CORS preflight requests for widget embed.
 *
 * Note: We check workspace CORS in POST (where we have callbackUrl).
 * OPTIONS is permissive because we don't have the body yet.
 * The actual security check happens in POST.
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Allow the preflight - actual CORS validation happens in POST
  // where we can extract workspace from callbackUrl
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "null",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  });
}

const sendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  callbackUrl: z.string().min(1, "Callback URL is required"),
});

/**
 * Validate that a callback URL is safe (same-origin or relative path).
 * Prevents open redirect vulnerabilities.
 *
 * Security considerations:
 * - Paths like `/\example.com` or `/\\example.com` could be interpreted
 *   as protocol-relative URLs in some browsers
 * - We use a strict regex to only allow safe characters in relative paths
 */
function isValidCallbackUrl(callback: string): boolean {
  // Strict regex: only allow alphanumeric, dash, underscore, forward slash, and query params
  // This prevents paths like `/\example.com` which some browsers interpret as redirects
  if (/^\/[a-zA-Z0-9\/_-]*(\?[a-zA-Z0-9=&_%-]*)?$/.test(callback)) {
    return true;
  }

  // For absolute URLs, strictly validate same origin (not just host)
  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL!);
    const callbackUrl = new URL(callback);
    // Use origin comparison (includes protocol) for stricter validation
    return callbackUrl.origin === appUrl.origin;
  } catch {
    return false;
  }
}

/**
 * Sanitize callback URL - returns "/" if invalid
 */
function sanitizeCallbackUrl(callback: string): string {
  return isValidCallbackUrl(callback) ? callback : "/";
}

/**
 * POST /api/contributor/verify
 * Send a verification email to a contributor
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    // Check rate limit before processing
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = checkEmailRateLimit(ip);

    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        "Too many verification requests. Please try again later.",
        rateLimitResult.resetAt!,
        0
      );
    }

    const body = await request.json();
    const { email, callbackUrl } = sendVerificationSchema.parse(body);

    // Extract workspace slug from callbackUrl for CORS validation
    const workspaceSlug = extractWorkspaceSlug(callbackUrl);

    // If we can identify the workspace, use workspace-aware CORS
    let corsHeaders: Record<string, string>;
    if (workspaceSlug) {
      corsHeaders = await getWorkspaceSlugCorsHeaders(
        origin,
        workspaceSlug,
        "GET, POST, OPTIONS"
      );
    } else {
      // Fallback: allow app's own origin only (for direct access from our app)
      const appOrigin = process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
        : null;
      const isAllowed =
        origin === appOrigin ||
        (process.env.NODE_ENV === "development" &&
          origin?.startsWith("http://localhost"));

      corsHeaders = {
        "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      };
    }

    // Sanitize callback URL before use
    const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl);

    const result = await sendVerificationEmail(email, safeCallbackUrl);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    // For errors, try to extract workspace from body if possible
    // Otherwise fall back to restrictive CORS
    const errorResponse = handleApiError(error);

    // Apply restrictive CORS on error (we may not have parsed the body successfully)
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
    errorResponse.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
    errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");
    errorResponse.headers.set("Vary", "Origin");

    return errorResponse;
  }
}

/**
 * GET /api/contributor/verify?token=xxx&callback=xxx
 * Verify a token and redirect back to the board
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const rawCallback = searchParams.get("callback") || "/";

    // Sanitize callback URL to prevent open redirect
    const callback = sanitizeCallbackUrl(rawCallback);

    if (!token) {
      throw new BadRequestError("Verification token is required");
    }

    const result = await verifyToken(token);

    if (!result) {
      // Token invalid or expired - redirect to callback with error
      const errorUrl = new URL(callback, process.env.NEXT_PUBLIC_APP_URL);
      errorUrl.searchParams.set("error", "invalid_token");
      return NextResponse.redirect(errorUrl.toString());
    }

    // Success - redirect to callback
    const successUrl = new URL(callback, process.env.NEXT_PUBLIC_APP_URL);
    successUrl.searchParams.set("verified", "true");
    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "UnknownError";

    // Parse URL again to check for token in logging (searchParams is out of scope)
    const url = new URL(request.url);
    console.error("[ContributorVerify] Verification failed:", {
      error: errorName,
      message: errorMessage,
      hasToken: !!url.searchParams.get("token"),
    });

    // Redirect to home with error on unexpected failure
    const errorUrl = new URL("/", process.env.NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}

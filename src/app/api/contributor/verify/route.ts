import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail, verifyToken } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { BadRequestError, RateLimitError } from "@/lib/errors";
import { checkEmailRateLimit } from "@/lib/contributor-rate-limit";
import { getCorsHeaders, applyCorsHeaders } from "@/lib/cors";

/**
 * OPTIONS /api/contributor/verify
 * Handle CORS preflight requests for widget embed
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin, "GET, POST, OPTIONS"),
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

    // Sanitize callback URL before use
    const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl);

    const origin = request.headers.get("origin");
    const result = await sendVerificationEmail(email, safeCallbackUrl);
    return NextResponse.json(result, { headers: getCorsHeaders(origin, "GET, POST, OPTIONS") });
  } catch (error) {
    const origin = request.headers.get("origin");
    const errorResponse = handleApiError(error);
    // Add CORS headers to error responses for widget compatibility
    applyCorsHeaders(errorResponse, origin, "GET, POST, OPTIONS");
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

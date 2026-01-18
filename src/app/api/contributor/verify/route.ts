import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail, verifyToken } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { BadRequestError, RateLimitError } from "@/lib/errors";
import { checkEmailRateLimit } from "@/lib/contributor-rate-limit";

// CORS headers for widget embed
// Note: Cannot use Allow-Credentials with wildcard origin (browsers reject this)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * OPTIONS /api/contributor/verify
 * Handle CORS preflight requests for widget embed
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const sendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  callbackUrl: z.string().min(1, "Callback URL is required"),
});

/**
 * Validate that a callback URL is safe (same-origin or relative path).
 * Prevents open redirect vulnerabilities.
 */
function isValidCallbackUrl(callback: string): boolean {
  // Allow relative paths that start with /
  if (callback.startsWith("/") && !callback.startsWith("//")) {
    return true;
  }

  // Check if absolute URL matches our app host
  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL!);
    const callbackUrl = new URL(callback, process.env.NEXT_PUBLIC_APP_URL);
    return callbackUrl.host === appUrl.host;
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

    const result = await sendVerificationEmail(email, safeCallbackUrl);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    const errorResponse = handleApiError(error);
    // Add CORS headers to error responses for widget compatibility
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
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

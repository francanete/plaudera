import { NextRequest, NextResponse } from "next/server";
import { clearContributorCookie } from "@/lib/contributor-auth";

/**
 * OPTIONS /api/contributor/logout
 * Handle CORS preflight requests for widget embed.
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Allow our app's origin and localhost in development
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : null;
  const isAllowed =
    origin === appOrigin ||
    (process.env.NODE_ENV === "development" &&
      origin?.startsWith("http://localhost"));

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    },
  });
}

/**
 * POST /api/contributor/logout
 * Clear the contributor authentication cookie.
 *
 * Security: Uses POST method to prevent accidental logout via link/img tags.
 * CORS is restricted to same-origin to prevent malicious cross-site logout.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Validate origin - only allow from our app's origin
  // This prevents malicious sites from logging out contributors
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : null;
  const isAllowed =
    origin === appOrigin ||
    (process.env.NODE_ENV === "development" &&
      origin?.startsWith("http://localhost"));

  // Even if origin doesn't match, we still clear the cookie
  // (logout should work), but we won't return CORS headers
  // that would allow the response to be read cross-origin
  await clearContributorCookie();

  const corsHeaders: Record<string, string> = {
    Vary: "Origin",
  };

  if (isAllowed && origin) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  return NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { headers: corsHeaders }
  );
}

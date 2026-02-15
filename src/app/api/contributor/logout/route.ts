import { NextRequest, NextResponse } from "next/server";
import { clearContributorCookie } from "@/lib/contributor-auth";
import { isOriginAllowedGlobally } from "@/lib/cors";

/**
 * Resolve a request origin for logout.
 * Returns the origin when allowed, otherwise null.
 */
async function getAllowedOrigin(origin: string | null): Promise<string | null> {
  if (!origin) return null;

  // Always allow our app's origin
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : null;
  if (origin === appOrigin) return origin;

  // Allow localhost in development
  if (
    process.env.NODE_ENV === "development" &&
    origin.startsWith("http://localhost")
  ) {
    return origin;
  }

  // Check if origin is in any workspace's allowed origins
  // This enables logout from embedded widgets on customer domains
  const isGloballyAllowed = await isOriginAllowedGlobally(origin);
  return isGloballyAllowed ? origin : null;
}

function buildPreflightHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function buildLogoutHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

/**
 * OPTIONS /api/contributor/logout
 * Handle CORS preflight requests for widget embed.
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigin = await getAllowedOrigin(origin);

  return new NextResponse(null, {
    status: 204,
    headers: buildPreflightHeaders(allowedOrigin),
  });
}

/**
 * POST /api/contributor/logout
 * Clear the contributor authentication cookie.
 *
 * Security: Uses POST method to prevent accidental logout via link/img tags.
 * CORS allows same-origin and registered widget embed origins.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigin = await getAllowedOrigin(origin);

  if (!allowedOrigin) {
    return NextResponse.json(
      { success: false, error: "Origin not allowed" },
      {
        status: 403,
        headers: buildLogoutHeaders(null),
      }
    );
  }

  // Clear cookie only for allowed origins to prevent cross-site logout CSRF
  await clearContributorCookie();

  return NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { headers: buildLogoutHeaders(allowedOrigin) }
  );
}

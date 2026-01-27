import { NextRequest, NextResponse } from "next/server";
import { clearContributorCookie } from "@/lib/contributor-auth";
import { isOriginAllowedGlobally } from "@/lib/cors";

/**
 * Check if origin is allowed for logout.
 * Allows: app origin, localhost in dev, or any globally allowed widget origin.
 */
async function isOriginAllowed(origin: string | null): Promise<boolean> {
  if (!origin) return false;

  // Always allow our app's origin
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : null;
  if (origin === appOrigin) return true;

  // Allow localhost in development
  if (
    process.env.NODE_ENV === "development" &&
    origin.startsWith("http://localhost")
  ) {
    return true;
  }

  // Check if origin is in any workspace's allowed origins
  // This enables logout from embedded widgets on customer domains
  return isOriginAllowedGlobally(origin);
}

/**
 * OPTIONS /api/contributor/logout
 * Handle CORS preflight requests for widget embed.
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = await isOriginAllowed(origin);

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowed && origin ? origin : "null",
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
 * CORS allows same-origin and registered widget embed origins.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = await isOriginAllowed(origin);

  // Always clear the cookie (logout should work regardless of CORS)
  await clearContributorCookie();

  const corsHeaders: Record<string, string> = {
    Vary: "Origin",
  };

  if (allowed && origin) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  return NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { headers: corsHeaders }
  );
}

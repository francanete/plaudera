import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/subscription";
import { appConfig } from "@/lib/config";

// Route definitions
const protectedRoutes = ["/dashboard", "/checkout/success"];
const authRoutes = ["/login"];
const gateRoute = "/gate";

const REQUIRE_PAID_ACCESS = appConfig.pricing.requirePaidAccess;

// Paths that should never be served on subdomain requests
const nonBoardPaths = [
  "/dashboard",
  "/login",
  "/signup",
  "/api",
  "/checkout",
  "/gate",
  "/embed",
  "/admin",
  "/_next",
];

/**
 * Extract subdomain from hostname.
 * e.g. "acme.plaudera.com" → "acme", "acme.localhost:3000" → "acme"
 * Returns null for root domain or non-subdomain hosts.
 */
export function extractSubdomain(hostname: string | null): string | null {
  if (!hostname) return null;

  // Strip port for comparison
  const hostWithoutPort = hostname.split(":")[0];

  // Get root domain from NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  let rootDomain: string;
  try {
    rootDomain = new URL(appUrl).hostname;
  } catch {
    return null;
  }

  // Handle localhost development: acme.localhost → acme
  if (rootDomain === "localhost" && hostWithoutPort.endsWith(".localhost")) {
    const subdomain = hostWithoutPort.slice(
      0,
      hostWithoutPort.length - ".localhost".length
    );
    return subdomain && subdomain !== "www" ? subdomain : null;
  }

  // Handle production: acme.plaudera.com → acme
  if (
    hostWithoutPort.endsWith(`.${rootDomain}`) &&
    hostWithoutPort !== rootDomain
  ) {
    const subdomain = hostWithoutPort.slice(
      0,
      hostWithoutPort.length - rootDomain.length - 1
    );
    // Only single-level subdomains (no dots)
    if (subdomain && !subdomain.includes(".") && subdomain !== "www") {
      return subdomain;
    }
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // === Subdomain Detection & Rewrite ===
  const hostname = req.headers.get("host");
  const subdomain = extractSubdomain(hostname);

  if (subdomain) {
    // Don't rewrite non-board paths on subdomains
    if (nonBoardPaths.some((p) => path.startsWith(p))) {
      return NextResponse.next();
    }

    // Rewrite subdomain requests to /b/{subdomain}{path}
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = `/b/${subdomain}${path}`;

    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-is-subdomain", "true");
    return response;
  }

  // Determine route type
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));
  const isGateRoute = path.startsWith(gateRoute);

  // Skip public routes (no checks needed)
  if (!isProtectedRoute && !isAuthRoute && !isGateRoute) {
    return NextResponse.next();
  }

  // Get session (uses Better Auth's 5-min cookie cache)
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // === Auth Route Logic ===
  // Redirect authenticated users away from login
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // === Protected Route Logic ===
  if (isProtectedRoute) {
    // No session → login
    if (!session) {
      const loginUrl = new URL("/login", req.nextUrl);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }

    // Query subscription (single DB query per request)
    const subscription = await getSubscriptionStatus(session.user.id);

    // Bypass paid gate for checkout success page:
    // User just completed payment via Polar redirect but the webhook/sync
    // may not have arrived yet. The success page itself is harmless (no app
    // features) and handles sync via a client-side server action call.
    const isPostCheckout = path === "/checkout/success";

    // Check paid access requirement
    if (
      REQUIRE_PAID_ACCESS &&
      subscription.plan === "FREE" &&
      !isPostCheckout
    ) {
      return NextResponse.redirect(new URL("/gate", req.nextUrl));
    }

    // Pass subscription to Server Components via header
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-subscription-status", JSON.stringify(subscription));
    requestHeaders.set("x-user-id", session.user.id);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // === Gate Route Logic ===
  if (isGateRoute) {
    // No session → login
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    const subscription = await getSubscriptionStatus(session.user.id);

    // Paid users shouldn't see gate - redirect to dashboard
    if (!REQUIRE_PAID_ACCESS || subscription.plan !== "FREE") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    // Pass subscription for gate page UI
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-subscription-status", JSON.stringify(subscription));
    requestHeaders.set("x-user-id", session.user.id);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, images, and API routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};

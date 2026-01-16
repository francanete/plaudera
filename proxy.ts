import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/subscription";
import { appConfig } from "@/lib/config";

// Route definitions
const protectedRoutes = ["/dashboard", "/checkout/success"];
const authRoutes = ["/login"];
const gateRoute = "/gate";

const REQUIRE_PAID_ACCESS = !appConfig.pricing.allowFreePlan;

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

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

    // Check paid access requirement
    if (REQUIRE_PAID_ACCESS && subscription.plan === "FREE") {
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

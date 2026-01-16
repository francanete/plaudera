import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth, type Session } from "./auth";
import { getSubscriptionStatus, type SubscriptionStatus } from "./subscription";
import { checkAIRateLimit, type AIRateLimitResult } from "./rate-limit";
import { handleApiError } from "./api-utils";
import { db } from "./db";
import { users } from "./db/schema";

// ============ Errors ============

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// ============ Types ============

export type AuthOptions = {
  requirePaid?: boolean; // default: true = requires any paid plan (not FREE)
  rateLimit?: boolean; // true = check AI rate limit
};

export type AuthContext<P = Record<string, string>> = {
  session: NonNullable<Session>;
  subscription: SubscriptionStatus;
  rateLimit?: AIRateLimitResult;
  params: P;
};

type RouteContext<P> = { params: Promise<P> };

type AuthHandler<P> = (
  request: Request,
  context: AuthContext<P>
) => Promise<Response>;

// ============ Session ============

export const getCurrentSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Get subscription status from proxy-injected header (no DB query).
 * Use this in layouts/pages where proxy.ts has already validated and passed subscription data.
 * Returns null if header is missing (e.g., for routes not covered by proxy).
 */
export const getSubscriptionFromRequest = cache(
  async (): Promise<SubscriptionStatus | null> => {
    const headersList = await headers();
    const subscriptionHeader = headersList.get("x-subscription-status");

    if (subscriptionHeader) {
      try {
        return JSON.parse(subscriptionHeader) as SubscriptionStatus;
      } catch (parseError) {
        console.warn("[DAL] Failed to parse x-subscription-status header:", {
          headerLength: subscriptionHeader.length,
          headerPreview: subscriptionHeader.substring(0, 50),
          error: parseError instanceof Error ? parseError.message : "Unknown",
        });
        // Invalid header, fall through to return null
      }
    }

    return null;
  }
);

// ============ Server Action Helper ============

export async function requirePaidAccess(): Promise<{
  userId: string;
  plan: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthError("Unauthorized");
  }

  const subscription = await getSubscriptionStatus(session.user.id);
  if (!subscription.hasAccess) {
    throw new AuthError("Active subscription required");
  }

  return { userId: session.user.id, plan: subscription.plan };
}

// ============ API Route Wrapper ============

export function protectedApiRouteWrapper<P = Record<string, string>>(
  handler: AuthHandler<P>,
  options: AuthOptions = {}
): (request: Request, context?: RouteContext<P>) => Promise<Response> {
  const { requirePaid = true, rateLimit } = options;

  return async (request: Request, routeContext?: RouteContext<P>) => {
    try {
      // 1. Session check (always required)
      const session = await getCurrentSession();
      if (!session) {
        return NextResponse.json(
          { error: "Unauthorized", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      // 2. Get subscription status
      const subscription = await getSubscriptionStatus(session.user.id);

      // 3. Paid access check (default: required)
      if (requirePaid && subscription.plan === "FREE") {
        return NextResponse.json(
          {
            error: "This feature requires a paid plan",
            code: "UPGRADE_REQUIRED",
          },
          { status: 403 }
        );
      }

      // 4. Rate limit check (optional)
      let rateLimitResult: AIRateLimitResult | undefined;
      if (rateLimit) {
        rateLimitResult = await checkAIRateLimit(
          session.user.id,
          subscription.plan
        );

        if (!rateLimitResult.success) {
          const retryAfter = Math.ceil(
            (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
          );
          return NextResponse.json(
            {
              error: "Too many requests. Please wait a moment.",
              code: "RATE_LIMIT",
              resetAt: rateLimitResult.resetAt.toISOString(),
              remaining: rateLimitResult.remaining,
            },
            { status: 429, headers: { "Retry-After": String(retryAfter) } }
          );
        }
      }

      // 5. Await params for dynamic routes
      const params = routeContext?.params
        ? await routeContext.params
        : ({} as P);

      // 6. Call handler with context
      return await handler(request, {
        session,
        subscription,
        rateLimit: rateLimitResult,
        params,
      });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// ============ Admin Access Helper ============

export async function requireAdminAccess(): Promise<{
  userId: string;
  isAdmin: true;
}> {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthError("Unauthorized");
  }

  // Verify email is verified (security hardening)
  if (!session.user.emailVerified) {
    throw new AuthError("Email not verified");
  }

  // Check user role in database
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { role: true },
  });

  if (!user || user.role !== "admin") {
    throw new AuthError("Admin access required");
  }

  return { userId: session.user.id, isAdmin: true };
}

// ============ Check Admin Status ============

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });

  return user?.role === "admin";
}

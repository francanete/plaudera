import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

/**
 * Unsubscribe a user from marketing emails using a signed token.
 * GET /api/unsubscribe?token=xxx
 *
 * The token is cryptographically signed and includes the email + expiration,
 * preventing unauthorized unsubscription attacks.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/unsubscribe?error=invalid-token", request.url)
    );
  }

  try {
    // Verify token and extract email
    const email = verifyUnsubscribeToken(token);

    if (!email) {
      return NextResponse.redirect(
        new URL("/unsubscribe?error=invalid-token", request.url)
      );
    }

    // Update user's marketing preference
    const result = await db
      .update(users)
      .set({ marketingUnsubscribed: true })
      .where(eq(users.email, email))
      .returning({ id: users.id });

    if (result.length === 0) {
      return NextResponse.redirect(
        new URL("/unsubscribe?error=not-found", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/unsubscribe?success=true", request.url)
    );
  } catch (error) {
    console.error("[Unsubscribe] Error:", error);
    return NextResponse.redirect(
      new URL("/unsubscribe?error=server-error", request.url)
    );
  }
}

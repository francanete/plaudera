import { getCurrentSession } from "@/lib/dal";
import { getSubscriptionStatus } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const subscription = await getSubscriptionStatus(session.user.id);

  return NextResponse.json({
    plan: subscription.plan,
    hasAccess: subscription.hasAccess,
    status: subscription.status,
    billingType: subscription.billingType,
    expiresAt: subscription.expiresAt,
  });
}

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/dal";
import { getSubscriptionStatus } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import type { Plan } from "@/lib/db/schema";

const PLAN_HIERARCHY: Plan[] = ["FREE", "STARTER", "GROWTH", "SCALE"];

interface PaidAccessGateProps {
  children: React.ReactNode;
  requiredPlan?: Plan;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

function hasRequiredPlan(userPlan: Plan, requiredPlan: Plan): boolean {
  const userLevel = PLAN_HIERARCHY.indexOf(userPlan);
  const requiredLevel = PLAN_HIERARCHY.indexOf(requiredPlan);
  return userLevel >= requiredLevel;
}

export async function PaidAccessGate({
  children,
  requiredPlan = "STARTER",
  redirectTo = "/login",
  fallback,
}: PaidAccessGateProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect(redirectTo);
  }

  const subscription = await getSubscriptionStatus(session.user.id);

  if (!hasRequiredPlan(subscription.plan, requiredPlan)) {
    return (
      <>
        {fallback ?? (
          <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center">
            <UpgradePrompt />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  onboardingFlows,
  duplicateSuggestions,
  workspaces,
} from "@/lib/db/schema";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getSubscriptionFromRequest, isUserAdmin } from "@/lib/dal";
import { appConfig } from "@/lib/config";
import { TrialBanner } from "@/components/trial-banner";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { CheckoutSuccessToast } from "@/components/checkout-success-toast";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import {
  SidebarInset,
  SidebarProvider,
  MobileSidebarTrigger,
} from "@/components/ui/sidebar";
import { IdentifyUser } from "@/components/analytics/identify-user";

const REQUIRE_PAID_ACCESS = !appConfig.pricing.allowFreePlan;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Session check (uses Better Auth's 5-min cookie cache)
  // proxy.ts handles redirects, this is a fallback
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Read subscription from proxy-injected header (no DB query)
  // Falls back to DB query if header is missing
  let subscription = await getSubscriptionFromRequest();
  if (!subscription) {
    subscription = await getSubscriptionStatus(session.user.id);
  }

  // Fallback: If paid access required and user is FREE, redirect to gate
  // (proxy.ts should handle this, but this is defense-in-depth)
  if (REQUIRE_PAID_ACCESS && subscription.plan === "FREE") {
    redirect("/gate");
  }

  // Get admin status, onboarding flow status, and pending duplicates count
  const [isAdmin, dashboardOnboarding, userWorkspace] = await Promise.all([
    isUserAdmin(session.user.id),
    db.query.onboardingFlows.findFirst({
      where: and(
        eq(onboardingFlows.userId, session.user.id),
        eq(onboardingFlows.flowId, "dashboard")
      ),
    }),
    db.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, session.user.id),
    }),
  ]);

  // Count pending duplicate suggestions for this workspace
  let pendingDuplicatesCount = 0;
  if (userWorkspace) {
    const [result] = await db
      .select({ count: count() })
      .from(duplicateSuggestions)
      .where(
        and(
          eq(duplicateSuggestions.workspaceId, userWorkspace.id),
          eq(duplicateSuggestions.status, "PENDING")
        )
      );
    pendingDuplicatesCount = result?.count ?? 0;
  }

  // Flow is completed if completedAt or skippedAt is set
  const dashboardFlowCompleted = !!(
    dashboardOnboarding?.completedAt || dashboardOnboarding?.skippedAt
  );

  return (
    <OnboardingProvider
      flowId="dashboard"
      flowCompleted={dashboardFlowCompleted}
    >
      <IdentifyUser />
      <SidebarProvider>
        <Suspense fallback={null}>
          <CheckoutSuccessToast />
        </Suspense>
        <AppSidebar
          user={session.user}
          plan={subscription.plan}
          subscriptionStatus={subscription.status}
          expiresAt={subscription.expiresAt}
          isAdmin={isAdmin}
          pendingDuplicatesCount={pendingDuplicatesCount}
        />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 px-4 md:hidden">
            <MobileSidebarTrigger />
          </header>
          {subscription.status === "TRIALING" && subscription.expiresAt && (
            <TrialBanner endsAt={subscription.expiresAt} />
          )}
          <main className="flex-1 p-3 sm:p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </OnboardingProvider>
  );
}

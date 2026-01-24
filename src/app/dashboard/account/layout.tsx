import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingFlows } from "@/lib/db/schema";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check if settings onboarding flow is completed
  const settingsOnboarding = await db.query.onboardingFlows.findFirst({
    where: and(
      eq(onboardingFlows.userId, session.user.id),
      eq(onboardingFlows.flowId, "settings")
    ),
  });

  const settingsFlowCompleted = !!(
    settingsOnboarding?.completedAt || settingsOnboarding?.skippedAt
  );

  return (
    <OnboardingProvider flowId="settings" flowCompleted={settingsFlowCompleted}>
      {children}
    </OnboardingProvider>
  );
}

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingFlows } from "@/lib/db/schema";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";

export default async function PreviewLayout({
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

  const flowOnboarding = await db.query.onboardingFlows.findFirst({
    where: and(
      eq(onboardingFlows.userId, session.user.id),
      eq(onboardingFlows.flowId, "widgetPreview")
    ),
  });

  const flowCompleted = !!(
    flowOnboarding?.completedAt || flowOnboarding?.skippedAt
  );

  return (
    <OnboardingProvider flowId="widgetPreview" flowCompleted={flowCompleted}>
      {children}
    </OnboardingProvider>
  );
}

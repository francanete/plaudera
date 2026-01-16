"use server";

import { getCurrentSession } from "@/lib/dal";
import { syncWithPolar, hasPaidAccess } from "@/lib/subscription";

export type SyncSubscriptionResult = {
  success: boolean;
  canAccessDashboard: boolean;
  error?: string;
};

/**
 * Sync subscription from Polar API and check paid access.
 * Used on checkout success page to immediately update subscription status.
 */
export async function syncSubscriptionAction(): Promise<SyncSubscriptionResult> {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      success: false,
      canAccessDashboard: false,
      error: "Not authenticated",
    };
  }

  try {
    await syncWithPolar(session.user.id);
    const canAccess = await hasPaidAccess(session.user.id);
    return { success: true, canAccessDashboard: canAccess };
  } catch (error) {
    console.error("Failed to sync with Polar:", error);
    // Check if they have access anyway (webhook might have arrived)
    const canAccess = await hasPaidAccess(session.user.id);
    return {
      success: false,
      canAccessDashboard: canAccess,
      error: "Sync failed",
    };
  }
}

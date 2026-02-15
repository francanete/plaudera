"use server";

import { getCurrentSession } from "@/lib/dal";
import {
  syncWithPolar,
  syncWithCustomerToken,
  hasPaidAccess,
} from "@/lib/subscription";

export type SyncSubscriptionResult = {
  success: boolean;
  canAccessDashboard: boolean;
  error?: string;
};

/**
 * Sync subscription from Polar API and check paid access.
 * When customerSessionToken is provided, uses the Customer Portal API for instant sync.
 * Falls back to admin API if token is missing or Customer Portal API fails.
 */
export async function syncSubscriptionAction(
  customerSessionToken?: string
): Promise<SyncSubscriptionResult> {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      success: false,
      canAccessDashboard: false,
      error: "Not authenticated",
    };
  }

  try {
    if (customerSessionToken) {
      try {
        await syncWithCustomerToken(
          session.user.id,
          customerSessionToken,
          session.user.email
        );
        const canAccess = await hasPaidAccess(session.user.id);
        return { success: true, canAccessDashboard: canAccess };
      } catch (portalError) {
        console.error(
          "Customer Portal API error, falling back to admin API:",
          portalError
        );
      }
    }

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

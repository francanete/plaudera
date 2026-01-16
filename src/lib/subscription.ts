import { polarClient } from "./polar-client";
import { db, subscriptions, type Plan, type BillingType } from "./db";
import { eq } from "drizzle-orm";
import { appConfig, getPlanFromPolarProduct } from "./config";

// ============ Types ============

export type SubscriptionStatusType =
  | "ACTIVE"
  | "CANCELED"
  | "PAST_DUE"
  | "TRIALING";

export type SubscriptionStatus = {
  hasAccess: boolean;
  status: SubscriptionStatusType | "NONE";
  billingType: BillingType | null;
  isLifetime: boolean;
  polarProductId: string | null;
  expiresAt: Date | null;
  plan: Plan;
};

// Plan tier hierarchy for comparison (higher tier wins)
const PLAN_HIERARCHY = appConfig.plans.hierarchy;

// ============ Webhook Helpers ============

export type UpsertSubscriptionData = {
  userId: string;
  polarCustomerId: string;
  polarSubscriptionId?: string;
  polarOrderId?: string;
  polarProductId: string;
  billingType: BillingType;
  status: SubscriptionStatusType;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
};

export async function upsertSubscription(
  data: UpsertSubscriptionData
): Promise<void> {
  const plan = getPlanFromPolarProduct(data.polarProductId);

  await db
    .insert(subscriptions)
    .values({
      userId: data.userId,
      polarCustomerId: data.polarCustomerId,
      polarSubscriptionId: data.polarSubscriptionId,
      polarOrderId: data.polarOrderId,
      polarProductId: data.polarProductId,
      billingType: data.billingType,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      plan,
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        polarCustomerId: data.polarCustomerId,
        polarSubscriptionId: data.polarSubscriptionId,
        polarOrderId: data.polarOrderId,
        polarProductId: data.polarProductId,
        billingType: data.billingType,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        plan,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

export type UpdateSubscriptionData = {
  polarSubscriptionId: string;
  status: SubscriptionStatusType;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
};

export async function updateSubscriptionStatus(
  data: UpdateSubscriptionData
): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.polarSubscriptionId, data.polarSubscriptionId));
}

// Map Polar status strings to our enum
export function mapPolarStatus(polarStatus: string): SubscriptionStatusType {
  switch (polarStatus.toLowerCase()) {
    case "active":
      return "ACTIVE";
    case "canceled":
    case "cancelled":
      return "CANCELED";
    case "past_due":
      return "PAST_DUE";
    case "trialing":
      return "TRIALING";
    default:
      // Unknown status - log and default to CANCELED for safety
      // This prevents granting access for unknown/failed payment states
      console.error(
        `Unknown Polar subscription status: "${polarStatus}" - defaulting to CANCELED`
      );
      return "CANCELED";
  }
}

// ============ Sync with Polar API ============

/**
 * Sync subscription from Polar API.
 * Fetches both subscriptions and orders, picks the higher tier.
 * Used by daily cron job to keep all users in sync.
 */
export async function syncWithPolar(userId: string): Promise<void> {
  try {
    // Look up customer by userId (externalId)
    const customer = await polarClient.customers.getExternal({
      externalId: userId,
    });

    // Fetch both subscriptions and orders in parallel
    const [subsResult, ordersResult] = await Promise.all([
      polarClient.subscriptions.list({ customerId: customer.id, active: true }),
      polarClient.orders.list({ customerId: customer.id }),
    ]);

    const activeSub = subsResult.result.items[0];
    const paidOrder = ordersResult.result.items.find((o) => o.paid);

    // Determine best option (higher tier wins)
    let bestOption: {
      type: "subscription" | "order" | "none";
      data?: unknown;
      plan: Plan;
    } = {
      type: "none",
      plan: "FREE",
    };

    if (activeSub?.product) {
      const subPlan = getPlanFromPolarProduct(activeSub.product.id);
      if (PLAN_HIERARCHY[subPlan] > PLAN_HIERARCHY[bestOption.plan]) {
        bestOption = { type: "subscription", data: activeSub, plan: subPlan };
      }
    }

    if (paidOrder?.product) {
      const orderPlan = getPlanFromPolarProduct(paidOrder.product.id);
      if (PLAN_HIERARCHY[orderPlan] > PLAN_HIERARCHY[bestOption.plan]) {
        bestOption = { type: "order", data: paidOrder, plan: orderPlan };
      }
    }

    // Apply the best option
    if (bestOption.type === "subscription") {
      const sub = bestOption.data as typeof activeSub;
      const statusToSave = mapPolarStatus(sub!.status);

      await upsertSubscription({
        userId,
        polarCustomerId: customer.id,
        polarSubscriptionId: sub!.id,
        polarProductId: sub!.product!.id,
        billingType: "recurring",
        status: statusToSave,
        currentPeriodEnd: sub!.currentPeriodEnd
          ? new Date(sub!.currentPeriodEnd)
          : undefined,
        cancelAtPeriodEnd: sub!.cancelAtPeriodEnd,
      });
    } else if (bestOption.type === "order") {
      const order = bestOption.data as typeof paidOrder;

      await upsertSubscription({
        userId,
        polarCustomerId: customer.id,
        polarOrderId: order!.id,
        polarProductId: order!.product!.id,
        billingType: "one_time",
        status: "ACTIVE",
      });
    } else {
      // Customer exists but no active subscription/order - mark as free

      await db
        .update(subscriptions)
        .set({
          polarCustomerId: customer.id,
          status: "ACTIVE",
          plan: "FREE",
          billingType: "none",
          polarSubscriptionId: null,
          polarOrderId: null,
          polarProductId: null,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userId));
    }
  } catch (error: unknown) {
    const apiError = error as { status?: number };
    if (apiError.status === 404) {
      // Customer not found in Polar = genuinely free user, mark as synced
      await db
        .update(subscriptions)
        .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId));
    } else {
      // Other errors (500, rate limit, network) - don't mark as synced, will retry
      console.error(`Polar API error for user ${userId}:`, error);
      throw error;
    }
  }
}

// ============ Access Control ============

/**
 * Check if user has paid access (not FREE).
 * Used for paid-only apps where free tier is disabled.
 */
export async function hasPaidAccess(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(userId);
  return status.hasAccess && status.plan !== "FREE";
}

/**
 * Get subscription status from database.
 * Simple read - no sync logic here. Sync is handled by:
 * 1. Webhooks (primary)
 * 2. Daily cron job (fallback)
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  let subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  // Create FREE record if missing (handles old users without subscription record)
  if (!subscription) {
    await db
      .insert(subscriptions)
      .values({
        userId,
        plan: "FREE",
        status: "ACTIVE",
        billingType: "none",
      })
      .onConflictDoNothing();

    subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });
  }

  // Handle edge case where subscription still doesn't exist (race condition)
  if (!subscription) {
    return {
      hasAccess: false,
      status: "NONE" as const,
      billingType: null,
      isLifetime: false,
      polarProductId: null,
      expiresAt: null,
      plan: "FREE" as Plan,
    };
  }

  // Just return what's in DB - no sync logic here
  const hasAccess =
    subscription.status === "ACTIVE" || subscription.status === "TRIALING";

  return {
    hasAccess,
    status: subscription.status as SubscriptionStatusType,
    billingType: subscription.billingType as BillingType | null,
    isLifetime: subscription.billingType === "one_time",
    polarProductId: subscription.polarProductId,
    expiresAt: subscription.currentPeriodEnd,
    plan: hasAccess ? (subscription.plan as Plan) : "FREE",
  };
}

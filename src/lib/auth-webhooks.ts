import { eq } from "drizzle-orm";
import { db, users, subscriptions } from "./db";
import { polarClient } from "./polar-client";
import {
  upsertSubscription,
  updateSubscriptionStatus,
  mapPolarStatus,
} from "./subscription";
import { inngest } from "./inngest/client";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload";
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload";

/**
 * Update Polar customer with our internal userId as externalId.
 * This ensures future webhook events have the correct externalId.
 */
export async function updatePolarCustomerExternalId(
  polarCustomerId: string,
  userId: string
): Promise<void> {
  try {
    await polarClient.customers.update({
      id: polarCustomerId,
      customerUpdate: { externalId: userId },
    });
  } catch (error) {
    console.error(
      `Failed to update Polar customer ${polarCustomerId} with externalId:`,
      error
    );
    // Don't throw - the subscription was still created successfully
  }
}

/**
 * Resolve or create user from Polar customer data.
 * Used by webhooks to handle guest checkout flow.
 *
 * Priority:
 * 1. Use externalId if set (existing user went through our checkout)
 * 2. Look up by email (user might exist from previous signup)
 * 3. Create new user (guest checkout - first time purchase)
 */
export async function resolveOrCreateUser(customer: {
  id: string; // Polar customer ID
  externalId?: string | null;
  email: string;
  name?: string | null;
}): Promise<string> {
  // 1. Use externalId if set (existing user went through our checkout)
  if (customer.externalId) {
    return customer.externalId;
  }

  // 2. Look up by email (user might exist from previous signup)
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, customer.email),
    columns: { id: true },
  });

  if (existingUser) {
    // Update Polar customer with our userId for future syncs
    await updatePolarCustomerExternalId(customer.id, existingUser.id);
    return existingUser.id;
  }

  // 3. Create new user from Polar customer data (guest checkout)
  const [newUser] = await db
    .insert(users)
    .values({
      email: customer.email,
      name: customer.name || null,
      emailVerified: false,
    })
    .returning({ id: users.id });

  // Create FREE subscription record (will be upgraded by webhook upsert)
  await db
    .insert(subscriptions)
    .values({
      userId: newUser.id,
      plan: "FREE",
      status: "ACTIVE",
      billingType: "none",
    })
    .onConflictDoNothing();

  // Update Polar customer with our userId for future syncs
  await updatePolarCustomerExternalId(customer.id, newUser.id);

  // Send event to trigger account setup email
  await inngest.send({
    name: "user/paid-signup",
    data: {
      userId: newUser.id,
      email: customer.email,
      name: customer.name || null,
    },
  });

  return newUser.id;
}

// ============ Webhook Handlers ============

export async function onOrderPaid(
  payload: WebhookOrderPaidPayload
): Promise<void> {
  const order = payload.data;
  const customer = order.customer;
  const product = order.product;

  // Skip if this order is part of a subscription
  if (order.subscriptionId) {
    return;
  }

  if (!product) {
    throw new Error(
      `Polar webhook: No product on order ${order.id} - cannot grant access`
    );
  }

  const userId = await resolveOrCreateUser({
    id: customer.id,
    externalId: customer.externalId,
    email: customer.email,
    name: customer.name,
  });

  await upsertSubscription({
    userId,
    polarCustomerId: customer.id,
    polarOrderId: order.id,
    polarProductId: product.id,
    billingType: "one_time",
    status: "ACTIVE",
  });
}

export async function onSubscriptionCreated(
  payload: WebhookSubscriptionCreatedPayload
): Promise<void> {
  const subscription = payload.data;
  const customer = subscription.customer;
  const product = subscription.product;

  if (!product) {
    throw new Error(
      `Polar webhook: No product on subscription ${subscription.id} - cannot grant access`
    );
  }

  const userId = await resolveOrCreateUser({
    id: customer.id,
    externalId: customer.externalId,
    email: customer.email,
    name: customer.name,
  });

  await upsertSubscription({
    userId,
    polarCustomerId: customer.id,
    polarSubscriptionId: subscription.id,
    polarProductId: product.id,
    billingType: "recurring",
    status: mapPolarStatus(subscription.status),
    currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  });
}

export async function onSubscriptionUpdated(
  payload: WebhookSubscriptionUpdatedPayload
): Promise<void> {
  const subscription = payload.data;

  await updateSubscriptionStatus({
    polarSubscriptionId: subscription.id,
    status: mapPolarStatus(subscription.status),
    currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  });
}

export async function onSubscriptionCanceled(
  payload: WebhookSubscriptionCanceledPayload
): Promise<void> {
  const subscription = payload.data;

  await updateSubscriptionStatus({
    polarSubscriptionId: subscription.id,
    status: "CANCELED",
  });
}

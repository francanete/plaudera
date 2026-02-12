import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { magicLink } from "better-auth/plugins/magic-link";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { polarClient } from "./polar-client";
import { eq } from "drizzle-orm";
import { db, users, subscriptions } from "./db";
import * as schema from "./db/schema";
import { sendEmail } from "./email";
import { appConfig } from "./config";
import { getPolarProducts } from "./pricing";
import {
  upsertSubscription,
  updateSubscriptionStatus,
  mapPolarStatus,
} from "./subscription";
import { inngest } from "./inngest/client";

/**
 * Update Polar customer with our internal userId as externalId.
 * This ensures future webhook events have the correct externalId.
 */
async function updatePolarCustomerExternalId(
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
async function resolveOrCreateUser(customer: {
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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
        await sendEmail({
          to: email,
          subject: `Sign in to ${appConfig.name}`,
          html: `
            <h1>Sign in to ${appConfig.name}</h1>
            <p>Click the link below to sign in:</p>
            <p><a href="${url}">Sign In</a></p>
            <p>This link expires in 5 minutes.</p>
            <p>If you didn't request this, ignore this email.</p>
          `,
        });
      },
      expiresIn: 60 * 5,
      disableSignUp: false,
    }),
    // Polar integration with dynamic products based on pricing mode
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: getPolarProducts(),
          successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,

          // One-time purchase (LTD)
          onOrderPaid: async (payload) => {
            const order = payload.data;
            const customer = order.customer;
            const product = order.product;

            // Skip if this order is part of a subscription (e.g., trial or recurring charge)
            // Let subscription webhooks handle these instead
            if (order.subscriptionId) {
              console.log(
                `Polar webhook: Skipping order ${order.id} - belongs to subscription ${order.subscriptionId}`
              );
              return;
            }

            if (!product) {
              // Throw error to trigger Polar webhook retry - user paid but we can't process
              throw new Error(
                `Polar webhook: No product on order ${order.id} - cannot grant access`
              );
            }

            if (!customer.externalId) {
              console.warn(
                `Polar webhook: Order ${order.id} missing externalId for customer ${customer.id} (${customer.email}) - falling back to user resolution`
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
          },

          // New recurring subscription
          onSubscriptionCreated: async (payload) => {
            const subscription = payload.data;
            const customer = subscription.customer;
            const product = subscription.product;

            if (!product) {
              // Throw error to trigger Polar webhook retry - user subscribed but we can't process
              throw new Error(
                `Polar webhook: No product on subscription ${subscription.id} - cannot grant access`
              );
            }

            if (!customer.externalId) {
              console.warn(
                `Polar webhook: Subscription ${subscription.id} missing externalId for customer ${customer.id} (${customer.email}) - falling back to user resolution`
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
              currentPeriodEnd: subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd)
                : undefined,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            });
          },

          // Subscription status/period changes
          onSubscriptionUpdated: async (payload) => {
            const subscription = payload.data;

            await updateSubscriptionStatus({
              polarSubscriptionId: subscription.id,
              status: mapPolarStatus(subscription.status),
              currentPeriodEnd: subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd)
                : undefined,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            });
          },

          // Subscription canceled
          onSubscriptionCanceled: async (payload) => {
            const subscription = payload.data;

            await updateSubscriptionStatus({
              polarSubscriptionId: subscription.id,
              status: "CANCELED",
            });
          },
        }),
      ],
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Trigger welcome email on new user signup
      // Paths: /sign-up (email), /callback/* (OAuth), /magic-link/verify (magic link)
      const isSignupPath =
        ctx.path.startsWith("/sign-up") ||
        ctx.path.startsWith("/callback") ||
        ctx.path.startsWith("/magic-link/verify");

      if (isSignupPath) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          await inngest.send({
            name: "user/created",
            data: {
              userId: newSession.user.id,
              email: newSession.user.email,
            },
          });
        }
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;

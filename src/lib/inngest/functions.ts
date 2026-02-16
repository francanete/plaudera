import { inngest, type InngestStepLike } from "./client";

// Re-export type for tests
export type { InngestStepLike };
import { detectDuplicatesJob } from "./functions/detect-duplicates";
import { db, users, subscriptions } from "@/lib/db";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { sendAccountSetupEmail } from "@/lib/email";
import {
  sendSequenceEmail,
  sendTransactionalEmail,
} from "@/lib/email-sequences";
import { syncWithPolar } from "@/lib/subscription";
import { createUserWorkspace } from "@/lib/workspace";
import { appConfig, type PaidTier } from "@/lib/config";
import { z } from "zod";

// ============ Event Schemas ============

const userCreatedEventSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  email: z.string().email("Invalid email format"),
});

const paidSignupEventSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  email: z.string().email("Invalid email format"),
  name: z.string().nullable(),
});

// ============ Constants ============

const BATCH_SIZE = 50;
const DELAY_BETWEEN_USERS_MS = 200; // ~5 requests/second
const DELAY_BETWEEN_BATCHES_MS = 5000; // 5 second pause between batches
const RATE_LIMIT_RETRY_DELAY_MS = 5000; // Wait 5s before retry on rate limit

// ============ Helpers ============

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ Jobs ============

// Welcome sequence: instant email + day 1 getting started + day 3 activation
export const welcomeSequenceJob = inngest.createFunction(
  { id: "welcome-sequence" },
  { event: "user/created" },
  async ({ event, step }) => {
    // Validate event data
    const parseResult = userCreatedEventSchema.safeParse(event.data);
    if (!parseResult.success) {
      console.error(
        "[welcome-sequence] Invalid event data:",
        parseResult.error.flatten()
      );
      throw new Error(
        `Invalid event data: ${parseResult.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const { userId, email } = parseResult.data;

    // Step 1: Create default FREE subscription for new user
    await step.run("create-subscription", async () => {
      await db
        .insert(subscriptions)
        .values({
          userId,
          plan: "FREE",
          status: "ACTIVE",
          billingType: "none",
        })
        .onConflictDoNothing(); // In case webhook already created one
    });

    // Step 1.5: Create default workspace for new user
    // createUserWorkspace handles duplicates via onConflictDoNothing
    await step.run("create-workspace", async () => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true },
      });
      await createUserWorkspace(userId, email, user?.name);
    });

    // Step 2: Get user name for emails
    const user = await step.run("get-user", async () => {
      const [u] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return u;
    });

    // Step 3: Send instant welcome email
    const welcomeResult = await step.run("send-welcome-instant", async () => {
      return sendSequenceEmail({
        userId,
        email,
        name: user?.name || null,
        emailKey: "welcome_instant",
      });
    });

    // Step 4: Wait 1 day
    await step.sleep("wait-day-1", "1d");

    // Step 5: Send day 1 getting started email
    const day1Result = await step.run("send-getting-started-day1", async () => {
      return sendSequenceEmail({
        userId,
        email,
        name: user?.name || null,
        emailKey: "getting_started_day1",
      });
    });

    // Step 6: Wait 2 more days (day 3 total)
    await step.sleep("wait-day-3", "2d");

    // Step 7: Send day 3 activation email
    const day3Result = await step.run("send-activation-day3", async () => {
      return sendSequenceEmail({
        userId,
        email,
        name: user?.name || null,
        emailKey: "activation_day3",
      });
    });

    return {
      welcome: welcomeResult,
      day1: day1Result,
      day3: day3Result,
    };
  }
);

// Daily sync of ALL subscriptions with Polar (with batching and retry)
export const syncAllSubscriptions = inngest.createFunction(
  { id: "sync-all-subscriptions" },
  { cron: "0 3 * * *" }, // Every day at 3 AM
  async ({ step }) => {
    // Get ALL users with subscription records
    const allUsers = await step.run("fetch-users", async () => {
      return db.select({ userId: subscriptions.userId }).from(subscriptions);
    });

    // Split into batches
    const batches = chunkArray(allUsers, BATCH_SIZE);

    let synced = 0;
    let errors = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      // Process batch as a step (for resumability if job fails)
      const batchResult = await step.run(
        `sync-batch-${batchIndex}`,
        async () => {
          let batchSynced = 0;
          let batchErrors = 0;

          for (const user of batch) {
            try {
              await syncWithPolar(user.userId);
              batchSynced++;
            } catch (error: unknown) {
              const apiError = error as { status?: number };

              // Retry once on rate limit (429)
              if (apiError.status === 429) {
                await delay(RATE_LIMIT_RETRY_DELAY_MS);
                try {
                  await syncWithPolar(user.userId);
                  batchSynced++;
                } catch (retryError) {
                  console.error(
                    `Failed to sync user ${user.userId} after retry:`,
                    retryError
                  );
                  batchErrors++;
                }
              } else {
                console.error(`Failed to sync user ${user.userId}:`, error);
                batchErrors++;
              }
            }

            // Rate limit: delay between each user
            await delay(DELAY_BETWEEN_USERS_MS);
          }

          return { synced: batchSynced, errors: batchErrors };
        }
      );

      synced += batchResult.synced;
      errors += batchResult.errors;

      // Pause between batches (except after last batch)
      if (batchIndex < batches.length - 1) {
        await step.sleep("batch-cooldown", DELAY_BETWEEN_BATCHES_MS);
      }
    }

    return {
      total: allUsers.length,
      synced,
      errors,
      batches: batches.length,
    };
  }
);

// Account setup email for users who paid via guest checkout
export const paidSignupEmailJob = inngest.createFunction(
  { id: "send-paid-signup-email" },
  { event: "user/paid-signup" },
  async ({ event, step }) => {
    // Validate event data
    const parseResult = paidSignupEventSchema.safeParse(event.data);
    if (!parseResult.success) {
      console.error(
        "[send-paid-signup-email] Invalid event data:",
        parseResult.error.flatten()
      );
      throw new Error(
        `Invalid event data: ${parseResult.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const { userId, email, name } = parseResult.data;

    // Wait briefly for subscription to be created by webhook
    await step.sleep("wait-for-webhook", "1s");

    // Get subscription to know the plan
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    const planName = subscription?.plan || "Premium";

    await sendAccountSetupEmail(email, name, planName);

    return { sent: true, plan: planName };
  }
);

// ============ Trial Ending Reminder ============

/**
 * Helper to format price from cents to display string
 */
function formatPrice(cents: number, interval: "monthly" | "annual"): string {
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return interval === "monthly" ? `$${dollars}/month` : `$${dollars}/year`;
}

/**
 * Helper to format date for email display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Extracted handler for testability
export async function trialEndingReminderHandler(step: InngestStepLike) {
  // Step 1: Find trials ending in 24-48 hours
  const trialsEndingSoon = await step.run("fetch-trials", async () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
    const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48h

    return db
      .select({
        userId: subscriptions.userId,
        plan: subscriptions.plan,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "TRIALING"),
          eq(subscriptions.billingType, "recurring"),
          gte(subscriptions.currentPeriodEnd, windowStart),
          lt(subscriptions.currentPeriodEnd, windowEnd)
        )
      );
  });

  if (trialsEndingSoon.length === 0) {
    return {
      sent: 0,
      skipped: 0,
      errors: 0,
      message: "No trials ending soon",
    };
  }

  // Step 2: Process in batches
  const batches = chunkArray(trialsEndingSoon, BATCH_SIZE);
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    const batchResult = await step.run(`send-batch-${batchIndex}`, async () => {
      let batchSent = 0;
      let batchSkipped = 0;
      let batchErrors = 0;

      // Batch query all users for this batch (fixes N+1 query)
      const userIds = batch.map((t) => t.userId);
      const usersData = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds));
      const userMap = new Map(usersData.map((u) => [u.id, u]));

      for (const trial of batch) {
        try {
          // Get user details from pre-fetched map
          const user = userMap.get(trial.userId);

          if (!user) {
            batchSkipped++;
            continue;
          }

          // Get plan display name and price
          const planKey = trial.plan as PaidTier;
          const tierConfig = appConfig.pricing.tiers[planKey];
          const planName = tierConfig?.marketing.name || trial.plan;
          // Default to monthly price for trial notifications
          const price = tierConfig
            ? formatPrice(tierConfig.prices.monthly, "monthly")
            : "your subscription price";

          const endDate = trial.currentPeriodEnd
            ? formatDate(new Date(trial.currentPeriodEnd))
            : "soon";

          // Send transactional email
          const result = await sendTransactionalEmail({
            userId: trial.userId,
            email: user.email,
            name: user.name,
            emailKey: "trial_ending_24h",
            templateData: {
              planName,
              endDate,
              price,
            },
          });

          if (result.sent) {
            batchSent++;
          } else {
            batchSkipped++;
          }
        } catch (error) {
          console.error(
            `Failed to send trial ending email for user ${trial.userId}:`,
            error
          );
          batchErrors++;
        }

        // Rate limit: delay between each user
        await delay(DELAY_BETWEEN_USERS_MS);
      }

      return {
        sent: batchSent,
        skipped: batchSkipped,
        errors: batchErrors,
      };
    });

    sent += batchResult.sent;
    skipped += batchResult.skipped;
    errors += batchResult.errors;

    // Pause between batches (except after last batch)
    if (batchIndex < batches.length - 1) {
      await step.sleep("batch-cooldown", DELAY_BETWEEN_BATCHES_MS);
    }
  }

  return {
    total: trialsEndingSoon.length,
    sent,
    skipped,
    errors,
    batches: batches.length,
  };
}

// Trial ending reminder: sends 24 hours before trial ends
export const trialEndingReminderJob = inngest.createFunction(
  { id: "trial-ending-reminder" },
  { cron: "0 9 * * *" }, // Every day at 9 AM UTC
  async ({ step }) => trialEndingReminderHandler(step as InngestStepLike)
);

export const functions = [
  welcomeSequenceJob,
  syncAllSubscriptions,
  paidSignupEmailJob,
  trialEndingReminderJob,
  detectDuplicatesJob,
];

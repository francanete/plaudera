import { db } from "./db";
import { users, emailsSent } from "./db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "./email";
import { generateUnsubscribeUrl } from "./unsubscribe-token";
import {
  emailTemplates,
  transactionalTemplates,
  transactionalTemplateRequiredFields,
  type TrialEndingParams,
} from "./email-templates";

// ============ Types ============

type SendSequenceEmailParams = {
  userId: string;
  email: string;
  name: string | null;
  emailKey: string;
};

type SendTransactionalEmailParams = {
  userId: string;
  email: string;
  name: string | null;
  emailKey: string;
  /** Additional template data (plan name, dates, prices, etc.) */
  templateData?: Record<string, string>;
};

type SendResult = {
  sent: boolean;
  reason?:
    | "already_sent"
    | "unsubscribed"
    | "user_not_found"
    | "unknown_template"
    | "missing_template_data";
};

// ============ Helper Function ============

/**
 * Send a sequence email with idempotency and unsubscribe checking.
 *
 * - Checks if email was already sent (prevents duplicates on retry)
 * - Checks if user has unsubscribed from marketing
 * - Sends email via Resend
 * - Records the sent email in database
 */
export async function sendSequenceEmail({
  userId,
  email,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  name,
  emailKey,
}: SendSequenceEmailParams): Promise<SendResult> {
  // 1. Check if already sent (idempotency)
  const existing = await db.query.emailsSent.findFirst({
    where: and(
      eq(emailsSent.userId, userId),
      eq(emailsSent.emailKey, emailKey)
    ),
  });

  if (existing) {
    return { sent: false, reason: "already_sent" };
  }

  // 2. Check unsubscribe status
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { marketingUnsubscribed: true },
  });

  if (!user) {
    return { sent: false, reason: "user_not_found" };
  }

  if (user.marketingUnsubscribed) {
    return { sent: false, reason: "unsubscribed" };
  }

  // 3. Get template and send email
  const templateKey = emailKey as keyof typeof emailTemplates;
  const template = emailTemplates[templateKey];

  if (!template) {
    console.error(`[Email Sequence] Unknown template: ${emailKey}`);
    return { sent: false, reason: "unknown_template" };
  }

  const { subject, html } = template();

  // Replace {{unsubscribe_url}} placeholder with secure token-based URL
  const unsubscribeUrl = generateUnsubscribeUrl(email);
  const htmlWithUnsubscribe = html.replace(
    /\{\{unsubscribe_url\}\}/g,
    unsubscribeUrl
  );

  // 4. Send email with error handling
  try {
    await sendEmail({
      to: email,
      subject,
      html: htmlWithUnsubscribe,
    });
  } catch (emailError) {
    console.error(
      `[Email Sequence] Failed to send ${emailKey} to ${email}:`,
      emailError
    );
    throw emailError; // Re-throw to let Inngest handle retry
  }

  // 5. Record that email was sent
  try {
    await db.insert(emailsSent).values({
      userId,
      emailKey,
    });
  } catch (dbError) {
    // Email was sent but DB insert failed - log critically
    // Don't throw since email WAS sent; idempotency check prevents re-send
    console.error(
      `[Email Sequence] CRITICAL: Email ${emailKey} sent to ${email} but DB insert failed:`,
      dbError
    );
  }

  return { sent: true };
}

/**
 * Send a transactional email (billing/account notifications).
 *
 * Unlike marketing emails, transactional emails:
 * - Bypass the marketing unsubscribe preference
 * - Still maintain idempotency (won't send duplicates)
 * - Are for billing notifications, security alerts, etc.
 */
export async function sendTransactionalEmail({
  userId,
  email,
  name,
  emailKey,
  templateData = {},
}: SendTransactionalEmailParams): Promise<SendResult> {
  // 1. Check if already sent (idempotency)
  const existing = await db.query.emailsSent.findFirst({
    where: and(
      eq(emailsSent.userId, userId),
      eq(emailsSent.emailKey, emailKey)
    ),
  });

  if (existing) {
    return { sent: false, reason: "already_sent" };
  }

  // 2. Verify user exists (skip unsubscribe check - this is transactional)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });

  if (!user) {
    return { sent: false, reason: "user_not_found" };
  }

  // 3. Get template and send email
  const templateKey = emailKey as keyof typeof transactionalTemplates;
  const template = transactionalTemplates[templateKey];

  if (!template) {
    console.error(`[Transactional Email] Unknown template: ${emailKey}`);
    return { sent: false, reason: "unknown_template" };
  }

  // Validate required template fields before sending
  const requiredFields = transactionalTemplateRequiredFields[templateKey];
  const missingFields = requiredFields.filter((field) => !templateData[field]);

  if (missingFields.length > 0) {
    console.error(
      `[Transactional Email] Missing required fields for ${emailKey}: ${missingFields.join(", ")}`
    );
    return { sent: false, reason: "missing_template_data" };
  }

  const { subject, html } = template({
    name: name || "there",
    ...templateData,
  } as TrialEndingParams);

  // 4. Send email with error handling
  try {
    await sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (emailError) {
    console.error(
      `[Transactional Email] Failed to send ${emailKey} to ${email}:`,
      emailError
    );
    throw emailError; // Re-throw to let Inngest handle retry
  }

  // 5. Record that email was sent
  try {
    await db.insert(emailsSent).values({
      userId,
      emailKey,
    });
  } catch (dbError) {
    // Email was sent but DB insert failed - log critically
    // Don't throw since email WAS sent; idempotency check prevents re-send
    console.error(
      `[Transactional Email] CRITICAL: Email ${emailKey} sent to ${email} but DB insert failed:`,
      dbError
    );
  }

  return { sent: true };
}

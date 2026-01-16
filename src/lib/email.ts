import { appConfig } from "./config";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  // Check for missing API key with environment-aware handling
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Email] RESEND_API_KEY is not configured. Cannot send emails in production."
      );
    }
    // Development: log and return fake ID
    console.log("[Email] Skipping send (no RESEND_API_KEY - dev mode):", {
      to,
      subject,
    });
    return { id: "dev-mode" };
  }

  // Lazy-load Resend to avoid instantiation at module load time
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: from || appConfig.email.from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("Email send error:", error);
    throw error;
  }

  return data;
}

/**
 * Send account setup email to users who purchased via guest checkout.
 * Provides a login link to access their newly created account.
 */
export async function sendAccountSetupEmail(
  email: string,
  name: string | null,
  planName: string
) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login?email=${encodeURIComponent(email)}&from=purchase`;

  return sendEmail({
    to: email,
    subject: `Your ${appConfig.name} account is ready!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Welcome${name ? `, ${name}` : ""}!</h1>
        <p>Thank you for purchasing the <strong>${planName}</strong> plan.</p>
        <p>Your account has been created with this email address.</p>
        <p>Click below to sign in and access your dashboard:</p>
        <p style="margin: 24px 0;">
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
            Access My Account
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          You can sign in with Google or request a magic link using this email.
        </p>
      </div>
    `,
  });
}

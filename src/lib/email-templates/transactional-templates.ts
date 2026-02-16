import { appConfig } from "@/lib/config";

export type TrialEndingParams = {
  name: string;
  planName: string;
  endDate: string;
  price: string;
};

export const transactionalTemplates = {
  trial_ending_24h: ({
    name,
    planName,
    endDate,
    price,
  }: TrialEndingParams) => ({
    subject: `Your ${appConfig.name} trial ends tomorrow`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111; font-size: 24px; margin-bottom: 16px;">Your trial is ending soon</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${name},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your free trial of the <strong>${planName}</strong> plan ends on <strong>${endDate}</strong>.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          After your trial ends, you'll be automatically charged <strong>${price}</strong> to continue your subscription.
        </p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;">
            <strong>Want to continue?</strong> No action needed – your subscription will automatically start.
          </p>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Need to make changes? You can manage your subscription anytime:
        </p>
        <p style="margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account"
             style="display: inline-block; padding: 14px 28px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Manage Subscription
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">
          If you have any questions, just reply to this email. We're here to help!
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 24px;">
          Best,<br />
          The ${appConfig.name} Team
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is a billing notification. You're receiving this because you have an active trial with ${appConfig.name}.
        </p>
      </div>
    `,
  }),
};

export const transactionalTemplateRequiredFields: Record<
  keyof typeof transactionalTemplates,
  string[]
> = {
  trial_ending_24h: ["planName", "endDate", "price"],
};

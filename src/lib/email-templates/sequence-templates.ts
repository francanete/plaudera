import { appConfig } from "@/lib/config";

export const emailTemplates = {
  welcome_instant: () => ({
    subject: `Welcome to ${appConfig.name}!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111; font-size: 24px; margin-bottom: 16px;">Welcome!</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Thanks for signing up for ${appConfig.name}. We're excited to have you on board!
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Here's what you can do to get started:
        </p>
        <ul style="color: #333; font-size: 16px; line-height: 1.8;">
          <li>Explore your dashboard</li>
          <li>Start adding the first feature ideas</li>
          <li>Share with your customers to get their votes</li>
        </ul>
        <p style="margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="display: inline-block; padding: 14px 28px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Go to Dashboard
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">
          If you have any questions, just reply to this email. We're here to help!
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #999; font-size: 12px;">
          <a href="{{unsubscribe_url}}" style="color: #999;">
            Unsubscribe from marketing emails
          </a>
        </p>
      </div>
    `,
  }),

  getting_started_day1: () => ({
    subject: `Ready to collect feedback?`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111; font-size: 24px; margin-bottom: 16px;">Your feedback board is ready</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi!
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          You signed up yesterday — nice! Here's how to start collecting feedback in under 5 minutes:
        </p>
        <ol style="color: #333; font-size: 16px; line-height: 2;">
          <li><strong>Customize your board URL</strong> — for example your-company.plaudera.com</li>
          <li><strong>Share the link</strong> — send your public board URL to a few customers</li>
          <li><strong>Embed the widget</strong> — drop a feedback button right into your app</li>
        </ol>
        <p style="margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/board"
             style="display: inline-block; padding: 14px 28px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Set Up Your Board
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">
          Have questions? Just reply to this email — we read every response.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #999; font-size: 12px;">
          <a href="{{unsubscribe_url}}" style="color: #999;">
            Unsubscribe from marketing emails
          </a>
        </p>
      </div>
    `,
  }),

  activation_day3: () => ({
    subject: `Get your first feedback today`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111; font-size: 24px; margin-bottom: 16px;">Get your first feedback today</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi!
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          The teams that get the most out of ${appConfig.name} share one thing in common: they start collecting feedback in their first few days.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Here's a quick guide to help you get your first customer feedback in 5 minutes:
        </p>
        <p style="margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/blog/get-first-customer-feedback-fast"
             style="display: inline-block; padding: 14px 28px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Read the Guide
          </a>
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 24px;">
          Your trial has 2 days left — plenty of time to see how ${appConfig.name} works for your team.
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">
          Questions? Just reply to this email — we're here to help.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #999; font-size: 12px;">
          <a href="{{unsubscribe_url}}" style="color: #999;">
            Unsubscribe from marketing emails
          </a>
        </p>
      </div>
    `,
  }),
};

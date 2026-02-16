import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { magicLink } from "better-auth/plugins/magic-link";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { polarClient } from "./polar-client";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendEmail } from "./email";
import { appConfig } from "./config";
import { getPolarProducts } from "./pricing";
import { inngest } from "./inngest/client";
import {
  onOrderPaid,
  onSubscriptionCreated,
  onSubscriptionUpdated,
  onSubscriptionCanceled,
} from "./auth-webhooks";

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
          onOrderPaid,
          onSubscriptionCreated,
          onSubscriptionUpdated,
          onSubscriptionCanceled,
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

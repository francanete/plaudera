import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient(), polarClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;

// Polar-specific exports
export const checkout = authClient.checkout;
export const customer = authClient.customer;

/**
 * Centralized user-facing message strings.
 */
export const MESSAGES = {
  // Rate Limits
  RATE_LIMIT_DAILY: (hours: number) =>
    `You've reached your daily limit. Resets in ${hours} hour${hours === 1 ? "" : "s"}.`,
  RATE_LIMIT_UPGRADE: "Upgrade your plan for higher limits.",

  // Checkout & Subscription
  CHECKOUT_SUCCESS: "Welcome! Your plan is now active.",
  UPGRADE_SUCCESS: (plan: string) =>
    `Upgraded to ${plan}! Enjoy your new limits.`,
  SUBSCRIPTION_CANCELED: "Your subscription has been canceled.",

  // Access
  FEATURE_LOCKED: "This feature requires a paid plan.",
};

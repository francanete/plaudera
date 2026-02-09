import { z } from "zod";

export const MAX_DAILY_SLUG_CHANGES = 3;
export const MAX_LIFETIME_SLUG_CHANGES = 10;

const RESERVED_SLUGS = new Set([
  // App routes
  "api",
  "b",
  "checkout",
  "dashboard",
  "embed",
  "gate",
  "login",
  "unsubscribe",
  // Marketing pages
  "privacy",
  "terms",
  "pricing",
  "blog",
  // Auth-related
  "auth",
  "signup",
  "register",
  "logout",
  // Common reserved words
  "admin",
  "settings",
  "widget",
  "account",
  "profile",
  "help",
  "support",
  "about",
  "contact",
  "feedback",
  "ideas",
  "app",
  "www",
  "mail",
  "ftp",
  "smtp",
  "imap",
  "pop",
  "ns1",
  "ns2",
  // Technical
  "static",
  "assets",
  "public",
  "private",
  "system",
  "status",
  "health",
  "robots",
  "sitemap",
  "favicon",
  // Brand (none currently)
]);

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(40, "Slug must be at most 40 characters")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/,
    "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with a hyphen."
  )
  .refine((slug) => !slug.includes("--"), {
    message: "Consecutive hyphens are not allowed",
  })
  .refine((slug) => !RESERVED_SLUGS.has(slug), {
    message: "This slug is reserved",
  });

export type SlugRateLimitResult = {
  allowed: boolean;
  error?: string;
  dailyRemaining: number;
  lifetimeRemaining: number;
};

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

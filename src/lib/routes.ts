/**
 * Centralized route constants for the application.
 * Use these for revalidatePath calls to prevent typos and ensure consistency.
 */
export const DASHBOARD_ROUTES = {
  ROOT: "/dashboard",
  IDEAS: "/dashboard/ideas",
  DUPLICATES: "/dashboard/duplicates",
  BOARD: "/dashboard/board",
  ACCOUNT: "/dashboard/account",
  ADMIN_TIERS: "/dashboard/admin/tiers",
} as const;

export const PUBLIC_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  PRICING: "/pricing",
} as const;

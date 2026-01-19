/**
 * CORS utilities for widget embed endpoints
 *
 * Security: Uses per-workspace allowlists stored in the database.
 * Each workspace owner can configure which domains can embed their widget.
 * This prevents malicious sites from exploiting contributor sessions.
 *
 * Base origins (always allowed):
 * - App's own origin (NEXT_PUBLIC_APP_URL)
 * - localhost variants in development mode
 */

import { db } from "@/lib/db";
import { widgetSettings, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ============ Origin Validation Utilities ============

/**
 * Normalize and validate an origin URL.
 * Returns the normalized origin (protocol + host) or null if invalid.
 *
 * Examples:
 * - "https://example.com" → "https://example.com"
 * - "https://example.com/" → "https://example.com"
 * - "https://example.com/path" → "https://example.com"
 * - "not-a-url" → null
 * - "ftp://example.com" → null (only http/https allowed)
 */
export function normalizeOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    // Only allow http and https protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    // Return just the origin (protocol + host + port)
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Validate and normalize an array of origins.
 * Filters out invalid origins and returns only valid, normalized ones.
 */
export function validateOrigins(origins: string[]): string[] {
  return origins
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => origin !== null);
}

// ============ Per-Workspace CORS (DB-based) ============

/**
 * Get the base allowed origins (app's own origin + dev localhost).
 * These are always allowed regardless of workspace configuration.
 */
function getBaseAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Always allow the app's own origin
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const normalized = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
    if (normalized) origins.push(normalized);
  }

  // In development, allow common localhost variants
  if (process.env.NODE_ENV === "development") {
    origins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001"
    );
  }

  return origins;
}

/**
 * Check if an origin is allowed for a specific workspace by ID.
 * Checks both the workspace's configured allowlist and base origins.
 */
export async function isWorkspaceOriginAllowed(
  origin: string | null,
  workspaceId: string
): Promise<boolean> {
  if (!origin) return false;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  // Check base origins first (app's own origin, dev localhost)
  const baseOrigins = getBaseAllowedOrigins();
  if (baseOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // Check workspace-specific allowlist from database
  const settings = await db.query.widgetSettings.findFirst({
    where: eq(widgetSettings.workspaceId, workspaceId),
    columns: { allowedOrigins: true },
  });

  const allowedOrigins = settings?.allowedOrigins ?? [];
  return allowedOrigins.includes(normalizedOrigin);
}

/**
 * Check if an origin is allowed for a specific workspace by slug.
 * Used by public API routes that identify workspaces by slug.
 */
export async function isWorkspaceSlugOriginAllowed(
  origin: string | null,
  slug: string
): Promise<boolean> {
  if (!origin) return false;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  // Check base origins first (app's own origin, dev localhost)
  const baseOrigins = getBaseAllowedOrigins();
  if (baseOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // Find workspace and its settings by slug
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    with: { widgetSettings: { columns: { allowedOrigins: true } } },
  });

  if (!workspace) return false;

  const allowedOrigins = workspace.widgetSettings?.allowedOrigins ?? [];
  return allowedOrigins.includes(normalizedOrigin);
}

/**
 * Build CORS headers for a workspace-aware request.
 * Returns proper headers based on whether the origin is in the workspace's allowlist.
 */
export async function getWorkspaceCorsHeaders(
  requestOrigin: string | null,
  workspaceId: string,
  methods: string = "GET, POST, OPTIONS"
): Promise<Record<string, string>> {
  const allowed = await isWorkspaceOriginAllowed(requestOrigin, workspaceId);

  return {
    "Access-Control-Allow-Origin":
      allowed && requestOrigin ? requestOrigin : "null",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

/**
 * Build CORS headers for a workspace-aware request using slug.
 * Returns proper headers based on whether the origin is in the workspace's allowlist.
 */
export async function getWorkspaceSlugCorsHeaders(
  requestOrigin: string | null,
  slug: string,
  methods: string = "GET, POST, OPTIONS"
): Promise<Record<string, string>> {
  const allowed = await isWorkspaceSlugOriginAllowed(requestOrigin, slug);

  return {
    "Access-Control-Allow-Origin":
      allowed && requestOrigin ? requestOrigin : "null",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

/**
 * Apply workspace-aware CORS headers to a response.
 */
export async function applyWorkspaceCorsHeaders(
  response: Response,
  requestOrigin: string | null,
  workspaceId: string,
  methods?: string
): Promise<void> {
  const headers = await getWorkspaceCorsHeaders(
    requestOrigin,
    workspaceId,
    methods
  );
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

/**
 * Apply workspace-aware CORS headers to a response using slug.
 */
export async function applyWorkspaceSlugCorsHeaders(
  response: Response,
  requestOrigin: string | null,
  slug: string,
  methods?: string
): Promise<void> {
  const headers = await getWorkspaceSlugCorsHeaders(
    requestOrigin,
    slug,
    methods
  );
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

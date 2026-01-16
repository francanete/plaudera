import { db } from "./db";
import { workspaces, type Workspace } from "./db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

/**
 * Generate a URL-safe slug from an email address.
 * Format: email-prefix + random 6-char suffix (e.g., "johndoe-x7k2m9")
 */
export function generateSlug(email: string): string {
  const prefix = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);

  const suffix = createId().slice(0, 8);

  return `${prefix}-${suffix}`;
}

/**
 * Create a default workspace for a new user.
 * Uses the user's name or email prefix for the workspace name.
 * Handles concurrent requests safely with onConflictDoNothing.
 */
export async function createUserWorkspace(
  userId: string,
  email: string,
  name?: string | null
): Promise<Workspace> {
  const workspaceName = name || email.split("@")[0];
  const slug = generateSlug(email);

  // Use onConflictDoNothing to handle race conditions safely
  await db
    .insert(workspaces)
    .values({
      name: `${workspaceName}'s Workspace`,
      slug,
      ownerId: userId,
    })
    .onConflictDoNothing();

  // Always fetch after (handles both insert and conflict cases)
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });

  if (!workspace) {
    throw new Error(`Failed to create or retrieve workspace for user ${userId}`);
  }

  return workspace;
}

/**
 * Get the user's primary workspace.
 * In MVP, each user has exactly one workspace.
 */
export async function getUserWorkspace(
  userId: string
): Promise<Workspace | null> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, userId),
  });

  return workspace || null;
}

/**
 * Get a workspace by its public slug.
 * Used for public idea board URLs.
 */
export async function getWorkspaceBySlug(
  slug: string
): Promise<Workspace | null> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });

  return workspace || null;
}

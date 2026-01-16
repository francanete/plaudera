import { db } from "./db";
import { workspaces, type Workspace } from "./db/schema";
import { eq } from "drizzle-orm";

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

  const suffix = Math.random().toString(36).substring(2, 8);

  return `${prefix}-${suffix}`;
}

/**
 * Create a default workspace for a new user.
 * Uses the user's name or email prefix for the workspace name.
 */
export async function createUserWorkspace(
  userId: string,
  email: string,
  name?: string | null
): Promise<Workspace> {
  const workspaceName = name || email.split("@")[0];
  const slug = generateSlug(email);

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: `${workspaceName}'s Workspace`,
      slug,
      ownerId: userId,
    })
    .returning();

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

"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { slugSchema } from "@/lib/slug-validation";
import { workspaceBrandingSchema } from "@/lib/workspace-validation";
import { DASHBOARD_ROUTES } from "@/lib/routes";
import {
  updateWorkspaceSlug as updateSlug,
  getUserWorkspace,
} from "@/lib/workspace";
import { db, workspaces } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function updateWorkspaceSlug(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const rawSlug = formData.get("slug");
  const parsed = slugSchema.safeParse(rawSlug);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await updateSlug(session.user.id, parsed.data);

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath(DASHBOARD_ROUTES.BOARD);
  return { success: true, slug: result.slug };
}

export async function updateWorkspaceBrandingAction(formData: {
  name: string;
  description?: string | null;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const result = workspaceBrandingSchema.safeParse(formData);

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    return { error: "Workspace not found" };
  }

  try {
    await db
      .update(workspaces)
      .set({
        name: result.data.name,
        description: result.data.description,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspace.id));

    revalidatePath(DASHBOARD_ROUTES.BOARD);

    return { success: true, ...result.data };
  } catch {
    return { error: "Failed to update workspace branding" };
  }
}

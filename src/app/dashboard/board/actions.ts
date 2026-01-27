"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { slugSchema } from "@/lib/slug-validation";
import { DASHBOARD_ROUTES } from "@/lib/routes";
import { updateWorkspaceSlug as updateSlug } from "@/lib/workspace";

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

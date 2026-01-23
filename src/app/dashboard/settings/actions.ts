"use server";

import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugSchema } from "@/lib/slug-validation";
import { updateWorkspaceSlug as updateSlug } from "@/lib/workspace";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function updateProfile(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    name: formData.get("name"),
  };

  const result = profileSchema.safeParse(rawData);

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    await db
      .update(users)
      .set({ name: result.data.name, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile" };
  }
}

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

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/widget");
  return { success: true, slug: result.slug };
}

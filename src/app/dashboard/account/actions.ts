"use server";

import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DASHBOARD_ROUTES } from "@/lib/routes";

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

    revalidatePath(DASHBOARD_ROUTES.ACCOUNT);
    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile" };
  }
}

import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/dal";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check if user is admin
  const isAdmin = await isUserAdmin(session.user.id);

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}

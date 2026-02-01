import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserWorkspace } from "@/lib/workspace";
import { PreviewClient } from "./preview-client";

export default async function WidgetPreviewPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    redirect("/dashboard/widget");
  }

  return <PreviewClient workspaceId={workspace.id} />;
}

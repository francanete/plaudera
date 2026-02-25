import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, strategicTags } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { TagManager } from "./tag-manager";

export default async function TagsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const workspace = await getUserWorkspace(session!.user.id);

  let initialTags: { id: string; name: string; color: string }[] = [];
  if (workspace) {
    initialTags = await db
      .select({
        id: strategicTags.id,
        name: strategicTags.name,
        color: strategicTags.color,
      })
      .from(strategicTags)
      .where(eq(strategicTags.workspaceId, workspace.id))
      .orderBy(strategicTags.name);
  }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Strategic Tags"
        subtitle="Create tags to classify and organize your ideas."
      />
      <TagManager initialTags={initialTags} />
    </div>
  );
}

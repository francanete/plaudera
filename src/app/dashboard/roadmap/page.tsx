import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, ideas } from "@/lib/db";
import { eq, ne, and, desc } from "drizzle-orm";
import { getUserWorkspace, createUserWorkspace } from "@/lib/workspace";
import { RoadmapList } from "./roadmap-list";
import { Map, Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export default async function RoadmapPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  let workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    workspace = await createUserWorkspace(
      session.user.id,
      session.user.email,
      session.user.name
    );
  }

  const roadmapIdeas = await db
    .select()
    .from(ideas)
    .where(
      and(eq(ideas.workspaceId, workspace.id), ne(ideas.roadmapStatus, "NONE"))
    )
    .orderBy(desc(ideas.voteCount));

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Roadmap"
        subtitle="Track the progress of ideas you've committed to building."
        icon={Map}
        iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        action={{
          label: "New idea",
          href: "/dashboard/roadmap/create",
          icon: Plus,
        }}
      />

      <RoadmapList ideas={roadmapIdeas} />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, ideas } from "@/lib/db";
import { eq, ne, and, desc } from "drizzle-orm";
import { getUserWorkspace, createUserWorkspace } from "@/lib/workspace";
import { RoadmapList } from "./roadmap-list";
import { Map } from "lucide-react";

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
      <header className="mb-2">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
            <Map className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-foreground text-2xl font-semibold">Roadmap</h1>
        </div>
        <p className="text-muted-foreground text-base">
          Track the progress of ideas you&apos;ve committed to building.
        </p>
      </header>

      <RoadmapList ideas={roadmapIdeas} />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, ideas } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getUserWorkspace, createUserWorkspace } from "@/lib/workspace";
import { IdeasList } from "./ideas-list";
import { Lightbulb } from "lucide-react";
import type { IdeaStatus } from "@/lib/db/schema";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function IdeasPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Get or create workspace
  let workspace = await getUserWorkspace(session.user.id);

  // If no workspace exists (for existing users), create one
  if (!workspace) {
    workspace = await createUserWorkspace(
      session.user.id,
      session.user.email,
      session.user.name
    );
  }

  const workspaceIdeas = await db.query.ideas.findMany({
    where: eq(ideas.workspaceId, workspace.id),
    orderBy: [desc(ideas.createdAt)],
  });

  // Get initial status filter from URL
  const { status } = await searchParams;
  const validStatuses: IdeaStatus[] = [
    "PENDING",
    "NEW",
    "UNDER_REVIEW",
    "PLANNED",
    "IN_PROGRESS",
    "DONE",
    "DECLINED",
  ];
  const initialStatusFilter = validStatuses.includes(status as IdeaStatus)
    ? (status as IdeaStatus)
    : undefined;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Lightbulb className="h-8 w-8" />
            Ideas
          </h1>
          <p className="text-muted-foreground mt-1">
            Collect and manage feature requests from your users.
          </p>
        </div>
      </div>

      <IdeasList
        initialIdeas={workspaceIdeas}
        workspaceSlug={workspace.slug}
        initialStatusFilter={initialStatusFilter}
      />
    </div>
  );
}

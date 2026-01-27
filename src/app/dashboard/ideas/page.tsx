import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, ideas, duplicateSuggestions } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { getUserWorkspace, createUserWorkspace } from "@/lib/workspace";
import { IdeasList } from "./ideas-list";
import { Lightbulb } from "lucide-react";

export default async function IdeasPage() {
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

  // Fetch ideas and pending duplicate suggestions in parallel
  const [workspaceIdeas, pendingDuplicates] = await Promise.all([
    db.query.ideas.findMany({
      where: eq(ideas.workspaceId, workspace.id),
      orderBy: [desc(ideas.createdAt)],
    }),
    db
      .select({
        sourceIdeaId: duplicateSuggestions.sourceIdeaId,
        duplicateIdeaId: duplicateSuggestions.duplicateIdeaId,
      })
      .from(duplicateSuggestions)
      .where(
        and(
          eq(duplicateSuggestions.workspaceId, workspace.id),
          eq(duplicateSuggestions.status, "PENDING")
        )
      ),
  ]);

  // Collect all idea IDs that are part of pending duplicate suggestions
  const ideasWithDuplicates = new Set<string>();
  for (const dup of pendingDuplicates) {
    ideasWithDuplicates.add(dup.sourceIdeaId);
    ideasWithDuplicates.add(dup.duplicateIdeaId);
  }

  return (
    <div className="space-y-8">
      <header className="mb-2">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
            <Lightbulb className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-foreground text-2xl font-semibold">Ideas</h1>
        </div>
        <p className="text-muted-foreground text-base">
          Collect and manage feature requests from your users.
        </p>
      </header>

      <IdeasList
        initialIdeas={workspaceIdeas}
        workspaceSlug={workspace.slug}
        ideasWithDuplicates={Array.from(ideasWithDuplicates)}
      />
    </div>
  );
}

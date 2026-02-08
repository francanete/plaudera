import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db, duplicateSuggestions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { queryDashboardIdeas } from "@/lib/idea-queries";
import { getUserWorkspace, createUserWorkspace } from "@/lib/workspace";
import { IdeasList } from "./ideas-list";
import { Lightbulb, Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
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
    queryDashboardIdeas(workspace.id),
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
      <DashboardPageHeader
        title="Ideas"
        subtitle="Collect and manage feature requests from your users."
        icon={Lightbulb}
        iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        action={
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 gap-2"
          >
            <Link href="/dashboard/ideas?create=true">
              <Plus className="h-4 w-4" />
              New idea
            </Link>
          </Button>
        }
      />

      <IdeasList
        initialIdeas={workspaceIdeas}
        ideasWithDuplicates={Array.from(ideasWithDuplicates)}
        defaultCreating={resolvedSearchParams.create === "true"}
      />
    </div>
  );
}

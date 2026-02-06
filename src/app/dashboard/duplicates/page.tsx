import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, duplicateSuggestions } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { getUserWorkspace } from "@/lib/workspace";
import { DuplicatesList } from "./duplicates-list";
import { Copy } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export default async function DuplicatesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    redirect("/dashboard");
  }

  // Fetch pending duplicate suggestions with both ideas
  const suggestions = await db.query.duplicateSuggestions.findMany({
    where: and(
      eq(duplicateSuggestions.workspaceId, workspace.id),
      eq(duplicateSuggestions.status, "PENDING")
    ),
    with: {
      sourceIdea: {
        columns: {
          id: true,
          title: true,
          description: true,
          status: true,
          roadmapStatus: true,
          voteCount: true,
          createdAt: true,
        },
      },
      duplicateIdea: {
        columns: {
          id: true,
          title: true,
          description: true,
          status: true,
          roadmapStatus: true,
          voteCount: true,
          createdAt: true,
        },
      },
    },
    orderBy: [desc(duplicateSuggestions.similarity)],
  });

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Duplicate Detection"
        subtitle="AI-detected potential duplicate ideas for your review."
        icon={Copy}
        iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
      />

      <DuplicatesList initialSuggestions={suggestions} />
    </div>
  );
}

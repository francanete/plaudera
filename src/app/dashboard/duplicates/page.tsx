import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, duplicateSuggestions } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { getUserWorkspace } from "@/lib/workspace";
import { DuplicatesList } from "./duplicates-list";
import { Copy } from "lucide-react";

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
          voteCount: true,
          createdAt: true,
        },
      },
    },
    orderBy: [desc(duplicateSuggestions.similarity)],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Copy className="h-8 w-8" />
            Duplicate Detection
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-detected potential duplicate ideas for your review.
          </p>
        </div>
      </div>

      <DuplicatesList initialSuggestions={suggestions} />
    </div>
  );
}

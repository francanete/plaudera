import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { IdeaDetail } from "./idea-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function IdeaDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    notFound();
  }

  // Fetch idea with workspace and merged children
  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, id),
    with: {
      workspace: true,
      mergedFrom: {
        columns: { id: true, title: true },
      },
    },
  });

  // Check if idea exists and user owns the workspace
  if (!idea || idea.workspace.ownerId !== session.user.id) {
    notFound();
  }

  // Roadmap ideas should be viewed on the roadmap detail page
  if (idea.roadmapStatus !== "NONE") {
    redirect(`/dashboard/roadmap/${idea.id}`);
  }

  // Fetch PUBLISHED ideas in the same workspace for the merge picker
  const publishedIdeas = await db
    .select({ id: ideas.id, title: ideas.title })
    .from(ideas)
    .where(
      and(
        eq(ideas.workspaceId, idea.workspaceId),
        eq(ideas.status, "PUBLISHED"),
        ne(ideas.id, id)
      )
    );

  return (
    <IdeaDetail
      idea={idea}
      mergedChildren={idea.mergedFrom}
      publishedIdeas={publishedIdeas}
    />
  );
}

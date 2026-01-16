import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  // Fetch idea with workspace to verify ownership
  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, id),
    with: {
      workspace: true,
    },
  });

  // Check if idea exists and user owns the workspace
  if (!idea || idea.workspace.ownerId !== session.user.id) {
    notFound();
  }

  return <IdeaDetail idea={idea} />;
}

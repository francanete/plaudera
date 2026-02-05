import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { RoadmapIdeaDetail } from "./roadmap-idea-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RoadmapDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    notFound();
  }

  const idea = await db.query.ideas.findFirst({
    where: eq(ideas.id, id),
    with: {
      workspace: true,
    },
  });

  if (!idea || idea.workspace.ownerId !== session.user.id) {
    notFound();
  }

  // Non-roadmap ideas should be viewed on the idea detail page
  if (idea.roadmapStatus === "NONE") {
    redirect(`/dashboard/ideas/${idea.id}`);
  }

  return <RoadmapIdeaDetail idea={idea} />;
}

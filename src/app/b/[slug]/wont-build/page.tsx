import { Suspense } from "react";
import { queryWontBuildIdeas } from "@/lib/idea-queries";
import { WontBuildView } from "@/components/board/wont-build-view";
import { getWorkspaceBySlug, getBoardUrl } from "@/lib/workspace";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  if (!workspace) {
    return { title: "Not Found" };
  }

  return {
    title: `Won't Build - ${workspace.name}`,
    description: `See which ideas ${workspace.name} has decided not to build and why`,
    alternates: {
      canonical: `${getBoardUrl(slug)}/wont-build`,
    },
  };
}

async function WontBuildContent({ slug }: { slug: string }) {
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return null;

  const wontBuildIdeas = await queryWontBuildIdeas(workspace.id);

  const ideas = wontBuildIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    wontBuildReason: idea.wontBuildReason,
    updatedAt: idea.updatedAt,
  }));

  return <WontBuildView ideas={ideas} />;
}

export default async function WontBuildPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<WontBuildSkeleton />}>
      <WontBuildContent slug={slug} />
    </Suspense>
  );
}

function WontBuildSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="space-y-3">
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-16 w-full animate-pulse rounded-lg bg-red-50 dark:bg-red-950/20" />
          </div>
        </div>
      ))}
    </div>
  );
}

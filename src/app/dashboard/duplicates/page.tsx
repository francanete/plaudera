import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, duplicateSuggestions } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { getUserWorkspace } from "@/lib/workspace";
import { ClusterList } from "./cluster-list";
import { Copy } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

interface ClusterIdea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  roadmapStatus: string;
  voteCount: number;
  createdAt: Date;
}

interface SuggestionWithIdeas {
  id: string;
  sourceIdeaId: string;
  duplicateIdeaId: string;
  similarity: number;
  sourceIdea: ClusterIdea;
  duplicateIdea: ClusterIdea;
}

export interface Cluster {
  canonicalId: string;
  ideas: ClusterIdea[];
  pairs: {
    suggestionId: string;
    ideaAId: string;
    ideaBId: string;
    similarity: number;
  }[];
}

// Union-Find for building connected components
class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    const rankA = this.rank.get(rootA) ?? 0;
    const rankB = this.rank.get(rootB) ?? 0;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }
}

export default async function DuplicatesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) redirect("/dashboard");

  const suggestions = (await db.query.duplicateSuggestions.findMany({
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
  })) as unknown as SuggestionWithIdeas[];

  // Build clusters via union-find
  const uf = new UnionFind();
  const ideaMap = new Map<string, ClusterIdea>();

  for (const s of suggestions) {
    uf.union(s.sourceIdeaId, s.duplicateIdeaId);
    ideaMap.set(s.sourceIdeaId, s.sourceIdea);
    ideaMap.set(s.duplicateIdeaId, s.duplicateIdea);
  }

  // Group into clusters
  const clusterMap = new Map<
    string,
    { ideas: Set<string>; pairs: Cluster["pairs"] }
  >();
  for (const s of suggestions) {
    const root = uf.find(s.sourceIdeaId);
    if (!clusterMap.has(root)) {
      clusterMap.set(root, { ideas: new Set(), pairs: [] });
    }
    const cluster = clusterMap.get(root)!;
    cluster.ideas.add(s.sourceIdeaId);
    cluster.ideas.add(s.duplicateIdeaId);
    cluster.pairs.push({
      suggestionId: s.id,
      ideaAId: s.sourceIdeaId,
      ideaBId: s.duplicateIdeaId,
      similarity: s.similarity,
    });
  }

  // Convert to Cluster objects, canonical = idea with most votes
  const clusters: Cluster[] = [];
  for (const [, data] of clusterMap) {
    const clusterIdeas = [...data.ideas].map((id) => ideaMap.get(id)!);
    const canonical = clusterIdeas.reduce((best, idea) =>
      idea.voteCount > best.voteCount ? idea : best
    );
    clusterIdeas.sort((a, b) => {
      if (a.id === canonical.id) return -1;
      if (b.id === canonical.id) return 1;
      return b.voteCount - a.voteCount;
    });
    clusters.push({
      canonicalId: canonical.id,
      ideas: clusterIdeas,
      pairs: data.pairs,
    });
  }

  clusters.sort((a, b) => b.ideas.length - a.ideas.length);

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Duplicate Detection"
        subtitle="AI-detected potential duplicate ideas grouped for review."
        icon={Copy}
        iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
      />

      {suggestions.length > 0 && (
        <div className="text-muted-foreground text-sm">
          {clusters.length} {clusters.length === 1 ? "cluster" : "clusters"}{" "}
          from {suggestions.length} duplicate{" "}
          {suggestions.length === 1 ? "pair" : "pairs"}
        </div>
      )}

      <ClusterList initialClusters={clusters} />
    </div>
  );
}

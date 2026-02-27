import {
  eq,
  ne,
  desc,
  and,
  or,
  inArray,
  sql,
  count,
  isNotNull,
} from "drizzle-orm";
import {
  db,
  ideas,
  votes,
  contributors,
  duplicateSuggestions,
  roadmapStatusChanges,
  ideaStatusChanges,
  users,
  PUBLIC_VISIBLE_STATUSES,
  type FrequencyTag,
  type WorkflowImpact,
} from "@/lib/db";
import {
  isFreemailDomain,
  deriveRichness,
  mapFrequency,
  mapImpact,
} from "@/lib/confidence";

/**
 * Query public-visible ideas for a workspace.
 * Enforces two invariants:
 *   1. Only PUBLISHED ideas (+ contributor's own UNDER_REVIEW)
 *   2. Never includes roadmap items (roadmapStatus must be "NONE")
 *
 * Use this for: public board, embed widget, public API.
 */
export async function queryPublicIdeas(
  workspaceId: string,
  options?: { contributorId?: string; limit?: number }
) {
  const whereClause = options?.contributorId
    ? and(
        eq(ideas.workspaceId, workspaceId),
        eq(ideas.roadmapStatus, "NONE"),
        or(
          inArray(ideas.status, PUBLIC_VISIBLE_STATUSES),
          and(
            eq(ideas.status, "UNDER_REVIEW"),
            eq(ideas.contributorId, options.contributorId)
          )
        )
      )
    : and(
        eq(ideas.workspaceId, workspaceId),
        eq(ideas.roadmapStatus, "NONE"),
        inArray(ideas.status, PUBLIC_VISIBLE_STATUSES)
      );

  return db.query.ideas.findMany({
    where: whereClause,
    orderBy: [desc(ideas.voteCount), desc(ideas.createdAt)],
    ...(options?.limit ? { limit: options.limit } : {}),
  });
}

/**
 * Query PUBLISHED ideas that are on the roadmap (roadmapStatus != "NONE").
 * Used for the public board's roadmap tab.
 */
export async function queryPublicRoadmapIdeas(workspaceId: string) {
  return db.query.ideas.findMany({
    where: and(
      eq(ideas.workspaceId, workspaceId),
      ne(ideas.roadmapStatus, "NONE"),
      inArray(ideas.status, PUBLIC_VISIBLE_STATUSES)
    ),
    orderBy: [desc(ideas.voteCount), desc(ideas.createdAt)],
  });
}

/**
 * Query ideas for the dashboard ideas page.
 * Excludes roadmap items — those belong on /dashboard/roadmap.
 */
export async function queryDashboardIdeas(workspaceId: string) {
  return db.query.ideas.findMany({
    where: and(
      eq(ideas.workspaceId, workspaceId),
      eq(ideas.roadmapStatus, "NONE")
    ),
    orderBy: [desc(ideas.createdAt)],
    with: {
      strategicTags: {
        with: { tag: true },
      },
    },
  });
}

// ============ Confidence Signal Queries ============

export interface RawIdeaSignals {
  ideaId: string;
  organicVotes: number;
  inheritedVotes: number;
  uniqueContributors: number;
  votesLast14d: number;
  totalVotes: number;
  topDomain: string | null;
  topDomainCount: number;
  totalDomainVotes: number;
  clusterSize: number;
  avgSimilarity: number;
}

interface VoteAggregateRow {
  ideaId: string;
  organicVotes: number;
  inheritedVotes: number;
  uniqueContributors: number;
  votesLast14d: number;
  totalVotes: number;
}

interface DomainRow {
  ideaId: string;
  domain: string;
  domainCount: number;
}

interface DupeClusterRow {
  ideaId: string;
  clusterSize: number;
  avgSimilarity: number;
}

/**
 * Fetch raw confidence signals for a batch of ideas.
 * Runs 3 parallel SQL queries, merges results into a Map.
 */
export async function queryIdeaSignals(
  ideaIds: string[]
): Promise<Map<string, RawIdeaSignals>> {
  if (ideaIds.length === 0) return new Map();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [voteAggs, domainRows, dupeRows, dupeAsTarget] = await Promise.all([
    // Vote aggregates per idea
    db
      .select({
        ideaId: votes.ideaId,
        organicVotes:
          sql<number>`count(*) filter (where ${votes.isInherited} = false)`.as(
            "organic_votes"
          ),
        inheritedVotes:
          sql<number>`count(*) filter (where ${votes.isInherited} = true)`.as(
            "inherited_votes"
          ),
        uniqueContributors:
          sql<number>`count(distinct ${votes.contributorId})`.as(
            "unique_contributors"
          ),
        votesLast14d:
          sql<number>`count(*) filter (where ${votes.createdAt} >= ${fourteenDaysAgo})`.as(
            "votes_last_14d"
          ),
        totalVotes: count().as("total_votes"),
      })
      .from(votes)
      .where(inArray(votes.ideaId, ideaIds))
      .groupBy(votes.ideaId) as unknown as VoteAggregateRow[],

    // Domain distribution per idea (organic votes only)
    db
      .select({
        ideaId: votes.ideaId,
        domain: sql<string>`split_part(${contributors.email}, '@', 2)`.as(
          "domain"
        ),
        domainCount: count().as("domain_count"),
      })
      .from(votes)
      .innerJoin(contributors, eq(contributors.id, votes.contributorId))
      .where(and(inArray(votes.ideaId, ideaIds), eq(votes.isInherited, false)))
      .groupBy(
        votes.ideaId,
        sql`split_part(${contributors.email}, '@', 2)`
      ) as unknown as DomainRow[],

    // Duplicate cluster strength per idea (as source)
    db
      .select({
        ideaId: duplicateSuggestions.sourceIdeaId,
        clusterSize: count().as("cluster_size"),
        avgSimilarity: sql<number>`avg(${duplicateSuggestions.similarity})`.as(
          "avg_similarity"
        ),
      })
      .from(duplicateSuggestions)
      .where(
        and(
          inArray(duplicateSuggestions.sourceIdeaId, ideaIds),
          inArray(duplicateSuggestions.status, ["PENDING", "MERGED"])
        )
      )
      .groupBy(
        duplicateSuggestions.sourceIdeaId
      ) as unknown as DupeClusterRow[],

    // Duplicate cluster strength per idea (as target)
    db
      .select({
        ideaId: duplicateSuggestions.duplicateIdeaId,
        clusterSize: count().as("cluster_size"),
        avgSimilarity: sql<number>`avg(${duplicateSuggestions.similarity})`.as(
          "avg_similarity"
        ),
      })
      .from(duplicateSuggestions)
      .where(
        and(
          inArray(duplicateSuggestions.duplicateIdeaId, ideaIds),
          inArray(duplicateSuggestions.status, ["PENDING", "MERGED"])
        )
      )
      .groupBy(
        duplicateSuggestions.duplicateIdeaId
      ) as unknown as DupeClusterRow[],
  ]);

  // Build vote aggregates map
  const voteMap = new Map<string, VoteAggregateRow>();
  for (const row of voteAggs) {
    voteMap.set(row.ideaId, row);
  }

  // Build domain concentration map
  const domainMap = new Map<
    string,
    { topDomain: string; topDomainCount: number; totalDomainVotes: number }
  >();
  const domainsByIdea = new Map<string, DomainRow[]>();
  for (const row of domainRows) {
    const existing = domainsByIdea.get(row.ideaId) ?? [];
    existing.push(row);
    domainsByIdea.set(row.ideaId, existing);
  }
  for (const [ideaId, rows] of domainsByIdea) {
    let topDomain = "";
    let topCount = 0;
    let total = 0;
    for (const r of rows) {
      const c = Number(r.domainCount);
      total += c;
      if (c > topCount) {
        topCount = c;
        topDomain = r.domain;
      }
    }
    domainMap.set(ideaId, {
      topDomain,
      topDomainCount: topCount,
      totalDomainVotes: total,
    });
  }

  // Build dupe cluster map (merge source + target)
  const dupeMap = new Map<
    string,
    { clusterSize: number; avgSimilarity: number }
  >();
  for (const row of [...dupeRows, ...dupeAsTarget]) {
    const existing = dupeMap.get(row.ideaId);
    if (existing) {
      const totalSize = existing.clusterSize + Number(row.clusterSize);
      const totalSim =
        (existing.avgSimilarity * existing.clusterSize +
          Number(row.avgSimilarity) * Number(row.clusterSize)) /
        totalSize;
      dupeMap.set(row.ideaId, {
        clusterSize: totalSize,
        avgSimilarity: totalSim,
      });
    } else {
      dupeMap.set(row.ideaId, {
        clusterSize: Number(row.clusterSize),
        avgSimilarity: Number(row.avgSimilarity),
      });
    }
  }

  // Assemble results
  const result = new Map<string, RawIdeaSignals>();
  for (const ideaId of ideaIds) {
    const va = voteMap.get(ideaId);
    const domain = domainMap.get(ideaId);
    const dupe = dupeMap.get(ideaId);

    result.set(ideaId, {
      ideaId,
      organicVotes: Number(va?.organicVotes ?? 0),
      inheritedVotes: Number(va?.inheritedVotes ?? 0),
      uniqueContributors: Number(va?.uniqueContributors ?? 0),
      votesLast14d: Number(va?.votesLast14d ?? 0),
      totalVotes: Number(va?.totalVotes ?? 0),
      topDomain: domain?.topDomain ?? null,
      topDomainCount: domain?.topDomainCount ?? 0,
      totalDomainVotes: domain?.totalDomainVotes ?? 0,
      clusterSize: dupe?.clusterSize ?? 0,
      avgSimilarity: dupe?.avgSimilarity ?? 0,
    });
  }

  return result;
}

/**
 * Build ConfidenceSignals from raw DB signals + idea fields.
 * Pure function — no DB access.
 */
export function buildConfidenceSignals(
  raw: RawIdeaSignals,
  idea: {
    createdAt: Date;
    description: string | null;
    problemStatement: string | null;
    frequencyTag: FrequencyTag | null;
    workflowImpact: WorkflowImpact | null;
  }
) {
  const weeksSinceCreated = Math.max(
    (Date.now() - idea.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
    1
  );
  const ageVelocity = raw.totalVotes / weeksSinceCreated;
  const recencyRatio =
    raw.totalVotes > 0 ? raw.votesLast14d / raw.totalVotes : 0;
  const dupeStrength =
    raw.clusterSize > 0 ? (raw.clusterSize * raw.avgSimilarity) / 100 : 0;
  const topDomainShare =
    raw.totalDomainVotes > 0 ? raw.topDomainCount / raw.totalDomainVotes : 0;

  return {
    organicVotes: raw.organicVotes,
    inheritedVotes: raw.inheritedVotes,
    uniqueContributors: raw.uniqueContributors,
    recencyRatio,
    ageVelocity,
    dupeStrength,
    richness: deriveRichness(idea.description, idea.problemStatement),
    frequency: mapFrequency(idea.frequencyTag),
    impact: mapImpact(idea.workflowImpact),
    topDomainShare,
    topDomain: raw.topDomain,
    isFreemailDominant: raw.topDomain ? isFreemailDomain(raw.topDomain) : false,
  };
}

// ============ Decision Governance Queries ============

export interface DecisionTimelineEntry {
  id: string;
  ideaId: string;
  domain: "roadmap" | "idea_status";
  fromStatus: string;
  toStatus: string;
  rationale: string | null;
  isPublic: boolean;
  decisionType: string | null;
  userName: string | null;
  createdAt: Date;
}

/**
 * Unified decision timeline for an idea.
 * Joins roadmapStatusChanges + ideaStatusChanges, ordered by date desc.
 */
export async function queryDecisionTimeline(
  ideaId: string
): Promise<DecisionTimelineEntry[]> {
  const [roadmapEntries, ideaEntries] = await Promise.all([
    db
      .select({
        id: roadmapStatusChanges.id,
        ideaId: roadmapStatusChanges.ideaId,
        fromStatus: roadmapStatusChanges.fromStatus,
        toStatus: roadmapStatusChanges.toStatus,
        rationale: roadmapStatusChanges.rationale,
        isPublic: roadmapStatusChanges.isPublic,
        decisionType: roadmapStatusChanges.decisionType,
        userName: users.name,
        createdAt: roadmapStatusChanges.changedAt,
      })
      .from(roadmapStatusChanges)
      .leftJoin(users, eq(users.id, roadmapStatusChanges.changedBy))
      .where(eq(roadmapStatusChanges.ideaId, ideaId))
      .orderBy(desc(roadmapStatusChanges.changedAt)),

    db
      .select({
        id: ideaStatusChanges.id,
        ideaId: ideaStatusChanges.ideaId,
        fromStatus: ideaStatusChanges.fromStatus,
        toStatus: ideaStatusChanges.toStatus,
        rationale: ideaStatusChanges.rationale,
        isPublic: ideaStatusChanges.isPublic,
        decisionType: ideaStatusChanges.decisionType,
        userName: users.name,
        createdAt: ideaStatusChanges.createdAt,
      })
      .from(ideaStatusChanges)
      .leftJoin(users, eq(users.id, ideaStatusChanges.userId))
      .where(eq(ideaStatusChanges.ideaId, ideaId))
      .orderBy(desc(ideaStatusChanges.createdAt)),
  ]);

  const timeline: DecisionTimelineEntry[] = [
    ...roadmapEntries.map((e) => ({ ...e, domain: "roadmap" as const })),
    ...ideaEntries.map((e) => ({ ...e, domain: "idea_status" as const })),
  ];

  timeline.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return timeline;
}

/**
 * Query DECLINED ideas with a wontBuildReason for the public Won't Build view.
 */
export async function queryWontBuildIdeas(workspaceId: string) {
  return db.query.ideas.findMany({
    where: and(
      eq(ideas.workspaceId, workspaceId),
      eq(ideas.status, "DECLINED"),
      isNotNull(ideas.wontBuildReason)
    ),
    columns: {
      id: true,
      title: true,
      description: true,
      wontBuildReason: true,
      updatedAt: true,
    },
    orderBy: [desc(ideas.updatedAt)],
  });
}

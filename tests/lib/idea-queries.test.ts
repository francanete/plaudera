import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mock setup (hoisted so they're available in vi.mock factories) ───────────

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));
const mockSelect = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      ideas: { findMany: mockFindMany },
    },
    select: (...args: unknown[]) => mockSelect(...args),
  },
  ideas: {
    id: "id",
    workspaceId: "workspace_id",
    roadmapStatus: "roadmap_status",
    status: "status",
    contributorId: "contributor_id",
    voteCount: "vote_count",
    createdAt: "created_at",
    updatedAt: "updated_at",
    description: "description",
    problemStatement: "problem_statement",
    frequencyTag: "frequency_tag",
    workflowImpact: "workflow_impact",
    wontBuildReason: "wont_build_reason",
  },
  votes: {
    ideaId: "idea_id",
    isInherited: "is_inherited",
    contributorId: "contributor_id",
    createdAt: "created_at",
  },
  contributors: { id: "id", email: "email" },
  duplicateSuggestions: {
    sourceIdeaId: "source_idea_id",
    duplicateIdeaId: "duplicate_idea_id",
    similarity: "similarity",
    status: "status",
  },
  roadmapStatusChanges: {
    id: "id",
    ideaId: "idea_id",
    fromStatus: "from_status",
    toStatus: "to_status",
    rationale: "rationale",
    isPublic: "is_public",
    decisionType: "decision_type",
    changedBy: "changed_by",
    changedAt: "changed_at",
  },
  ideaStatusChanges: {
    id: "id",
    ideaId: "idea_id",
    fromStatus: "from_status",
    toStatus: "to_status",
    rationale: "rationale",
    isPublic: "is_public",
    decisionType: "decision_type",
    userId: "user_id",
    createdAt: "created_at",
  },
  users: { id: "id", name: "name" },
  PUBLIC_VISIBLE_STATUSES: ["PUBLISHED"],
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import {
  queryPublicIdeas,
  queryPublicRoadmapIdeas,
  queryDashboardIdeas,
  queryIdeaSignals,
  buildConfidenceSignals,
} from "@/lib/idea-queries";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeIdeaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "idea-1",
    title: "Test idea",
    status: "PUBLISHED",
    roadmapStatus: "NONE",
    voteCount: 5,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("idea-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── queryPublicIdeas ──────────────────────────────────────────────────

  describe("queryPublicIdeas", () => {
    it("returns results from findMany", async () => {
      const rows = [makeIdeaRow(), makeIdeaRow({ id: "idea-2" })];
      mockFindMany.mockResolvedValue(rows);

      const result = await queryPublicIdeas("ws-1");

      expect(result).toEqual(rows);
      expect(mockFindMany).toHaveBeenCalledTimes(1);
    });

    it("passes limit option through when provided", async () => {
      mockFindMany.mockResolvedValue([]);

      await queryPublicIdeas("ws-1", { limit: 10 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      );
    });

    it("calls findMany without limit when not provided", async () => {
      mockFindMany.mockResolvedValue([]);

      await queryPublicIdeas("ws-1");

      const callArg = mockFindMany.mock.calls[0][0];
      expect(callArg.limit).toBeUndefined();
    });

    it("returns different results based on contributorId presence", async () => {
      const withContributor = [makeIdeaRow()];
      const withoutContributor = [makeIdeaRow(), makeIdeaRow({ id: "idea-2" })];

      // First call without contributorId
      mockFindMany.mockResolvedValueOnce(withoutContributor);
      const result1 = await queryPublicIdeas("ws-1");

      // Second call with contributorId
      mockFindMany.mockResolvedValueOnce(withContributor);
      const result2 = await queryPublicIdeas("ws-1", {
        contributorId: "contrib-1",
      });

      expect(result1).toEqual(withoutContributor);
      expect(result2).toEqual(withContributor);
      // The where clause differs between the two calls
      expect(mockFindMany).toHaveBeenCalledTimes(2);
      const call1Where = mockFindMany.mock.calls[0][0].where;
      const call2Where = mockFindMany.mock.calls[1][0].where;
      expect(call1Where).not.toEqual(call2Where);
    });
  });

  // ── queryPublicRoadmapIdeas ───────────────────────────────────────────

  describe("queryPublicRoadmapIdeas", () => {
    it("returns results from findMany", async () => {
      const rows = [makeIdeaRow({ roadmapStatus: "PLANNED" })];
      mockFindMany.mockResolvedValue(rows);

      const result = await queryPublicRoadmapIdeas("ws-1");

      expect(result).toEqual(rows);
    });

    it("calls findMany with expected arguments", async () => {
      mockFindMany.mockResolvedValue([]);

      await queryPublicRoadmapIdeas("ws-1");

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
          orderBy: expect.anything(),
        })
      );
    });
  });

  // ── queryDashboardIdeas ───────────────────────────────────────────────

  describe("queryDashboardIdeas", () => {
    it("returns results from findMany", async () => {
      const rows = [makeIdeaRow(), makeIdeaRow({ id: "idea-3" })];
      mockFindMany.mockResolvedValue(rows);

      const result = await queryDashboardIdeas("ws-1");

      expect(result).toEqual(rows);
    });

    it("calls findMany with expected arguments", async () => {
      mockFindMany.mockResolvedValue([]);

      await queryDashboardIdeas("ws-1");

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
          orderBy: expect.anything(),
        })
      );
    });
  });

  describe("queryIdeaSignals", () => {
    function mockSelectGroupByResults(results: unknown[]) {
      let idx = 0;
      mockSelect.mockImplementation(() => ({
        from: () => {
          const withGroupBy = {
            groupBy: vi.fn().mockImplementation(() =>
              Promise.resolve(results[idx++])
            ),
          };
          const withWhere = {
            where: vi.fn().mockReturnValue(withGroupBy),
          };
          return {
            ...withWhere,
            innerJoin: vi.fn().mockReturnValue(withWhere),
          };
        },
      }));
    }

    it("returns an empty map for empty input", async () => {
      const result = await queryIdeaSignals([]);

      expect(result.size).toBe(0);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("merges vote/domain/dupe rows with sensible defaults", async () => {
      mockSelectGroupByResults([
        [
          {
            ideaId: "idea-1",
            organicVotes: 5,
            inheritedVotes: 2,
            uniqueContributors: 4,
            votesLast14d: 3,
            totalVotes: 7,
          },
        ],
        [
          { ideaId: "idea-1", domain: "acme.com", domainCount: 3 },
          { ideaId: "idea-1", domain: "gmail.com", domainCount: 1 },
        ],
        [{ ideaId: "idea-1", clusterSize: 2, avgSimilarity: 70 }],
        [{ ideaId: "idea-1", clusterSize: 1, avgSimilarity: 80 }],
      ]);

      const result = await queryIdeaSignals(["idea-1", "idea-2"]);

      expect(result.get("idea-1")).toEqual({
        ideaId: "idea-1",
        organicVotes: 5,
        inheritedVotes: 2,
        uniqueContributors: 4,
        votesLast14d: 3,
        totalVotes: 7,
        topDomain: "acme.com",
        topDomainCount: 3,
        totalDomainVotes: 4,
        clusterSize: 3,
        avgSimilarity: (70 * 2 + 80 * 1) / 3,
      });
      expect(result.get("idea-2")).toEqual({
        ideaId: "idea-2",
        organicVotes: 0,
        inheritedVotes: 0,
        uniqueContributors: 0,
        votesLast14d: 0,
        totalVotes: 0,
        topDomain: null,
        topDomainCount: 0,
        totalDomainVotes: 0,
        clusterSize: 0,
        avgSimilarity: 0,
      });
    });
  });

  describe("buildConfidenceSignals", () => {
    it("computes recency, velocity, dupe strength, and domain share from raw signals", () => {
      vi.spyOn(Date, "now").mockReturnValue(
        new Date("2025-02-15T00:00:00.000Z").getTime()
      );

      const result = buildConfidenceSignals(
        {
          ideaId: "idea-1",
          organicVotes: 8,
          inheritedVotes: 2,
          uniqueContributors: 5,
          votesLast14d: 4,
          totalVotes: 10,
          topDomain: "company.com",
          topDomainCount: 3,
          totalDomainVotes: 5,
          clusterSize: 2,
          avgSimilarity: 75,
        },
        {
          createdAt: new Date("2025-02-01T00:00:00.000Z"),
          description: "a".repeat(120),
          problemStatement: "b".repeat(120),
          frequencyTag: "weekly",
          workflowImpact: "blocker",
        }
      );

      expect(result.organicVotes).toBe(8);
      expect(result.inheritedVotes).toBe(2);
      expect(result.uniqueContributors).toBe(5);
      expect(result.recencyRatio).toBe(0.4);
      expect(result.ageVelocity).toBe(5);
      expect(result.dupeStrength).toBe(1.5);
      expect(result.topDomainShare).toBe(0.6);
      expect(result.topDomain).toBe("company.com");
      expect(result.isFreemailDominant).toBe(false);
      expect(result.richness).toBe("rich");
      expect(result.frequency).toBeGreaterThan(0);
      expect(result.impact).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it("handles zero/empty values without division errors", () => {
      const result = buildConfidenceSignals(
        {
          ideaId: "idea-1",
          organicVotes: 0,
          inheritedVotes: 0,
          uniqueContributors: 0,
          votesLast14d: 0,
          totalVotes: 0,
          topDomain: null,
          topDomainCount: 0,
          totalDomainVotes: 0,
          clusterSize: 0,
          avgSimilarity: 0,
        },
        {
          createdAt: new Date(),
          description: null,
          problemStatement: null,
          frequencyTag: null,
          workflowImpact: null,
        }
      );

      expect(result.recencyRatio).toBe(0);
      expect(result.dupeStrength).toBe(0);
      expect(result.topDomainShare).toBe(0);
      expect(result.isFreemailDominant).toBe(false);
    });
  });
});

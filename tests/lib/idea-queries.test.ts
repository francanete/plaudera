import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mock setup (hoisted so they're available in vi.mock factories) ───────────

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      ideas: { findMany: mockFindMany },
    },
  },
  ideas: {
    workspaceId: "workspace_id",
    roadmapStatus: "roadmap_status",
    status: "status",
    contributorId: "contributor_id",
    voteCount: "vote_count",
    createdAt: "created_at",
  },
  PUBLIC_VISIBLE_STATUSES: ["PUBLISHED"],
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import {
  queryPublicIdeas,
  queryPublicRoadmapIdeas,
  queryDashboardIdeas,
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
});

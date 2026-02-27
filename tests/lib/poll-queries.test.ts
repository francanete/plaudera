import { vi, describe, it, expect, beforeEach } from "vitest";

const {
  mockPollsFindFirst,
  mockPollsFindMany,
  mockResponsesFindMany,
  mockUpdate,
  mockSelect,
} = vi.hoisted(() => ({
  mockPollsFindFirst: vi.fn(),
  mockPollsFindMany: vi.fn(),
  mockResponsesFindMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      polls: {
        findFirst: mockPollsFindFirst,
        findMany: mockPollsFindMany,
      },
      pollResponses: { findMany: mockResponsesFindMany },
    },
    update: mockUpdate,
    select: mockSelect,
  },
  polls: {
    id: "id",
    workspaceId: "workspace_id",
    status: "status",
    createdAt: "created_at",
  },
  pollResponses: {
    pollId: "poll_id",
    contributorId: "contributor_id",
    createdAt: "created_at",
  },
}));

import {
  getActivePoll,
  getPollById,
  listWorkspacePolls,
  getPollResponses,
} from "@/lib/poll-queries";

describe("poll-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============ getActivePoll ============

  describe("getActivePoll", () => {
    it("returns null when no active poll exists", async () => {
      mockPollsFindFirst.mockResolvedValue(undefined);

      const result = await getActivePoll("ws-1");

      expect(result).toBeNull();
    });

    it("returns the active poll when not expired", async () => {
      const activePoll = {
        id: "poll-1",
        workspaceId: "ws-1",
        status: "active",
        closesAt: null,
      };
      mockPollsFindFirst.mockResolvedValue(activePoll);

      const result = await getActivePoll("ws-1");

      expect(result).toEqual(activePoll);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns active poll when closesAt is in the future", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const activePoll = {
        id: "poll-1",
        status: "active",
        closesAt: futureDate,
      };
      mockPollsFindFirst.mockResolvedValue(activePoll);

      const result = await getActivePoll("ws-1");

      expect(result).toEqual(activePoll);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("lazy-closes an expired poll and returns null", async () => {
      const pastDate = new Date(Date.now() - 86400000);
      const expiredPoll = {
        id: "poll-1",
        status: "active",
        closesAt: pastDate,
      };
      mockPollsFindFirst.mockResolvedValue(expiredPoll);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      const result = await getActivePoll("ws-1");

      expect(result).toBeNull();
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "closed" })
      );
    });
  });

  // ============ getPollById ============

  describe("getPollById", () => {
    it("returns null when poll is not found", async () => {
      mockPollsFindFirst.mockResolvedValue(undefined);

      const result = await getPollById("poll-x", "ws-1");

      expect(result).toBeNull();
    });

    it("returns poll with response count", async () => {
      const poll = { id: "poll-1", workspaceId: "ws-1", question: "Q?" };
      mockPollsFindFirst.mockResolvedValue(poll);

      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      });
      mockSelect.mockReturnValue({ from: mockFrom });

      const result = await getPollById("poll-1", "ws-1");

      expect(result).toEqual({ ...poll, responseCount: 5 });
    });

    it("defaults response count to 0 when count result is empty", async () => {
      const poll = { id: "poll-1", workspaceId: "ws-1", question: "Q?" };
      mockPollsFindFirst.mockResolvedValue(poll);

      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([undefined]),
      });
      mockSelect.mockReturnValue({ from: mockFrom });

      const result = await getPollById("poll-1", "ws-1");

      expect(result).toEqual({ ...poll, responseCount: 0 });
    });
  });

  // ============ listWorkspacePolls ============

  describe("listWorkspacePolls", () => {
    it("returns empty array when no polls exist", async () => {
      mockPollsFindMany.mockResolvedValue([]);

      const result = await listWorkspacePolls("ws-1");

      expect(result).toEqual([]);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("returns polls with response counts merged", async () => {
      mockPollsFindMany.mockResolvedValue([
        { id: "poll-1", question: "Q1" },
        { id: "poll-2", question: "Q2" },
        { id: "poll-3", question: "Q3" },
      ]);

      const mockGroupBy = vi.fn().mockResolvedValue([
        { pollId: "poll-1", count: 3 },
        { pollId: "poll-3", count: 7 },
      ]);
      const mockWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const result = await listWorkspacePolls("ws-1");

      expect(result).toEqual([
        { id: "poll-1", question: "Q1", responseCount: 3 },
        { id: "poll-2", question: "Q2", responseCount: 0 },
        { id: "poll-3", question: "Q3", responseCount: 7 },
      ]);
    });
  });

  // ============ getPollResponses ============

  describe("getPollResponses", () => {
    it("returns responses with contributor and linked idea", async () => {
      const responses = [
        {
          id: "r-1",
          response: "Great idea",
          contributor: { id: "c-1", email: "a@b.com", name: "Alice" },
          linkedIdea: { id: "idea-1", title: "Feature X" },
        },
      ];
      mockResponsesFindMany.mockResolvedValue(responses);

      const result = await getPollResponses("poll-1");

      expect(result).toEqual(responses);
    });

    it("returns empty array when no responses exist", async () => {
      mockResponsesFindMany.mockResolvedValue([]);

      const result = await getPollResponses("poll-1");

      expect(result).toEqual([]);
    });
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";
import { NotFoundError, BadRequestError, ConflictError } from "@/lib/errors";

const {
  mockTxUpdate,
  mockTxInsert,
  mockTxExecute,
  mockTxSelect,
  mockTxQueryPollResponses,
  mockTransaction,
  mockDbInsert,
  mockDbUpdate,
  mockDbQueryPollsFindFirst,
} = vi.hoisted(() => ({
  mockTxUpdate: vi.fn(),
  mockTxInsert: vi.fn(),
  mockTxExecute: vi.fn(),
  mockTxSelect: vi.fn(),
  mockTxQueryPollResponses: { findFirst: vi.fn() },
  mockTransaction: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbQueryPollsFindFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      polls: { findFirst: mockDbQueryPollsFindFirst },
    },
    transaction: mockTransaction,
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
  polls: {
    id: "id",
    workspaceId: "workspace_id",
    status: "status",
  },
  pollResponses: {
    id: "id",
    pollId: "poll_id",
    contributorId: "contributor_id",
  },
}));

import {
  createPoll,
  activatePoll,
  closePoll,
  submitPollResponse,
  linkResponseToIdea,
} from "@/lib/poll-updates";

function setupTransaction() {
  const tx = {
    update: mockTxUpdate,
    insert: mockTxInsert,
    execute: mockTxExecute,
    select: mockTxSelect,
    query: { pollResponses: mockTxQueryPollResponses },
  };
  mockTransaction.mockImplementation(async (cb) => cb(tx));
  return tx;
}

function chainReturning(returnValue: unknown) {
  return {
    returning: vi.fn().mockResolvedValue([returnValue]),
  };
}

describe("poll-updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============ createPoll ============

  describe("createPoll", () => {
    it("creates a draft poll without a transaction", async () => {
      const newPoll = { id: "poll-1", status: "draft", question: "Q?" };
      const mockValues = vi.fn().mockReturnValue(chainReturning(newPoll));
      mockDbInsert.mockReturnValue({ values: mockValues });

      const result = await createPoll("ws-1", {
        question: "Q?",
        status: "draft",
      });

      expect(result).toEqual(newPoll);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("creates an active poll in a transaction and closes existing active polls", async () => {
      const tx = setupTransaction();
      const newPoll = { id: "poll-2", status: "active", question: "Q?" };

      // tx.update (close existing) chain
      const mockTxUpdateWhere = vi.fn().mockResolvedValue(undefined);
      const mockTxUpdateSet = vi
        .fn()
        .mockReturnValue({ where: mockTxUpdateWhere });
      mockTxUpdate.mockReturnValue({ set: mockTxUpdateSet });

      // tx.insert chain
      const mockTxInsertValues = vi
        .fn()
        .mockReturnValue(chainReturning(newPoll));
      mockTxInsert.mockReturnValue({ values: mockTxInsertValues });

      const result = await createPoll("ws-1", {
        question: "Q?",
        status: "active",
      });

      expect(result).toEqual(newPoll);
      expect(mockTransaction).toHaveBeenCalled();
      // Should have closed existing active poll
      expect(mockTxUpdate).toHaveBeenCalled();
      expect(mockTxUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "closed" })
      );
    });
  });

  // ============ activatePoll ============

  describe("activatePoll", () => {
    it("throws NotFoundError when poll does not exist", async () => {
      mockDbQueryPollsFindFirst.mockResolvedValue(undefined);

      await expect(activatePoll("poll-x", "ws-1")).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws BadRequestError when poll is already active", async () => {
      mockDbQueryPollsFindFirst.mockResolvedValue({
        id: "poll-1",
        status: "active",
      });

      await expect(activatePoll("poll-1", "ws-1")).rejects.toThrow(
        BadRequestError
      );
      await expect(activatePoll("poll-1", "ws-1")).rejects.toThrow(
        "already active"
      );
    });

    it("throws BadRequestError when poll is closed", async () => {
      mockDbQueryPollsFindFirst.mockResolvedValue({
        id: "poll-1",
        status: "closed",
      });

      await expect(activatePoll("poll-1", "ws-1")).rejects.toThrow(
        BadRequestError
      );
      await expect(activatePoll("poll-1", "ws-1")).rejects.toThrow(
        "closed poll"
      );
    });

    it("activates a draft poll and closes any existing active poll", async () => {
      mockDbQueryPollsFindFirst.mockResolvedValue({
        id: "poll-1",
        status: "draft",
      });

      const tx = setupTransaction();
      const activatedPoll = { id: "poll-1", status: "active" };

      // tx.update for closing existing active
      const mockCloseWhere = vi.fn().mockResolvedValue(undefined);
      const mockCloseSet = vi.fn().mockReturnValue({ where: mockCloseWhere });

      // tx.update for activating the poll
      const mockActivateReturning = vi.fn().mockResolvedValue([activatedPoll]);
      const mockActivateWhere = vi
        .fn()
        .mockReturnValue({ returning: mockActivateReturning });
      const mockActivateSet = vi
        .fn()
        .mockReturnValue({ where: mockActivateWhere });

      // First call closes active, second call activates draft
      mockTxUpdate
        .mockReturnValueOnce({ set: mockCloseSet })
        .mockReturnValueOnce({ set: mockActivateSet });

      const result = await activatePoll("poll-1", "ws-1");

      expect(result).toEqual(activatedPoll);
      expect(mockTxUpdate).toHaveBeenCalledTimes(2);
    });
  });

  // ============ closePoll ============

  describe("closePoll", () => {
    it("throws NotFoundError when poll does not exist", async () => {
      mockDbQueryPollsFindFirst.mockResolvedValue(undefined);

      await expect(closePoll("poll-x", "ws-1")).rejects.toThrow(NotFoundError);
    });

    it("throws BadRequestError when poll is already closed", async () => {
      mockDbQueryPollsFindFirst.mockResolvedValue({
        id: "poll-1",
        status: "closed",
      });

      await expect(closePoll("poll-1", "ws-1")).rejects.toThrow(
        BadRequestError
      );
      await expect(closePoll("poll-1", "ws-1")).rejects.toThrow(
        "already closed"
      );
    });

    it("closes an active poll", async () => {
      mockDbQueryPollsFindFirst.mockResolvedValue({
        id: "poll-1",
        status: "active",
      });

      const closedPoll = { id: "poll-1", status: "closed" };
      const mockReturning = vi.fn().mockResolvedValue([closedPoll]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbUpdate.mockReturnValue({ set: mockSet });

      const result = await closePoll("poll-1", "ws-1");

      expect(result).toEqual(closedPoll);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "closed" })
      );
    });
  });

  // ============ submitPollResponse ============

  describe("submitPollResponse", () => {
    it("throws BadRequestError for response over 700 characters", async () => {
      const longResponse = "a".repeat(701);

      await expect(
        submitPollResponse("poll-1", "c-1", longResponse, "ws-1")
      ).rejects.toThrow(BadRequestError);
      await expect(
        submitPollResponse("poll-1", "c-1", longResponse, "ws-1")
      ).rejects.toThrow("700 characters");
    });

    it("throws BadRequestError for empty/whitespace response", async () => {
      await expect(
        submitPollResponse("poll-1", "c-1", "   ", "ws-1")
      ).rejects.toThrow(BadRequestError);
      await expect(
        submitPollResponse("poll-1", "c-1", "   ", "ws-1")
      ).rejects.toThrow("empty");
    });

    it("throws NotFoundError when poll does not exist", async () => {
      setupTransaction();
      mockTxExecute.mockResolvedValue({ rows: [] });

      await expect(
        submitPollResponse("poll-x", "c-1", "response", "ws-1")
      ).rejects.toThrow(NotFoundError);
    });

    it("throws BadRequestError when poll is not active", async () => {
      setupTransaction();
      mockTxExecute.mockResolvedValue({
        rows: [{ id: "poll-1", status: "closed", maxResponses: null }],
      });

      await expect(
        submitPollResponse("poll-1", "c-1", "response", "ws-1")
      ).rejects.toThrow(BadRequestError);
      await expect(
        submitPollResponse("poll-1", "c-1", "response", "ws-1")
      ).rejects.toThrow("not active");
    });

    it("throws BadRequestError when poll has expired closesAt", async () => {
      setupTransaction();
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockTxExecute.mockResolvedValue({
        rows: [
          {
            id: "poll-1",
            status: "active",
            maxResponses: null,
            closesAt: pastDate,
          },
        ],
      });

      await expect(
        submitPollResponse("poll-1", "c-1", "response", "ws-1")
      ).rejects.toThrow(BadRequestError);
      await expect(
        submitPollResponse("poll-1", "c-1", "response", "ws-1")
      ).rejects.toThrow("expired");
    });

    it("throws ConflictError when contributor already responded", async () => {
      setupTransaction();
      mockTxExecute.mockResolvedValue({
        rows: [{ id: "poll-1", status: "active", maxResponses: null }],
      });
      mockTxQueryPollResponses.findFirst.mockResolvedValue({
        id: "existing-response",
      });

      await expect(
        submitPollResponse("poll-1", "c-1", "response", "ws-1")
      ).rejects.toThrow(ConflictError);
      await expect(
        submitPollResponse("poll-1", "c-1", "response", "ws-1")
      ).rejects.toThrow("already responded");
    });

    it("submits a response successfully", async () => {
      setupTransaction();
      mockTxExecute.mockResolvedValue({
        rows: [{ id: "poll-1", status: "active", maxResponses: null }],
      });
      mockTxQueryPollResponses.findFirst.mockResolvedValue(undefined);

      const newResponse = { id: "r-1", response: "My feedback" };
      const mockValues = vi.fn().mockReturnValue(chainReturning(newResponse));
      mockTxInsert.mockReturnValue({ values: mockValues });

      const result = await submitPollResponse(
        "poll-1",
        "c-1",
        "My feedback",
        "ws-1"
      );

      expect(result).toEqual(newResponse);
    });

    it("auto-closes poll when maxResponses is reached", async () => {
      setupTransaction();
      mockTxExecute.mockResolvedValue({
        rows: [{ id: "poll-1", status: "active", maxResponses: 3 }],
      });
      mockTxQueryPollResponses.findFirst.mockResolvedValue(undefined);

      const newResponse = { id: "r-1", response: "feedback" };
      const mockValues = vi.fn().mockReturnValue(chainReturning(newResponse));
      mockTxInsert.mockReturnValue({ values: mockValues });

      // Count returns 3 (equals maxResponses)
      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 3 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });
      mockTxSelect.mockReturnValue({ from: mockCountFrom });

      // tx.update to close the poll
      const mockCloseWhere = vi.fn().mockResolvedValue(undefined);
      const mockCloseSet = vi.fn().mockReturnValue({ where: mockCloseWhere });
      mockTxUpdate.mockReturnValue({ set: mockCloseSet });

      const result = await submitPollResponse(
        "poll-1",
        "c-1",
        "feedback",
        "ws-1"
      );

      expect(result).toEqual(newResponse);
      expect(mockTxUpdate).toHaveBeenCalled();
      expect(mockCloseSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "closed" })
      );
    });

    it("does not auto-close when count is below maxResponses", async () => {
      setupTransaction();
      mockTxExecute.mockResolvedValue({
        rows: [{ id: "poll-1", status: "active", maxResponses: 10 }],
      });
      mockTxQueryPollResponses.findFirst.mockResolvedValue(undefined);

      const newResponse = { id: "r-1", response: "feedback" };
      const mockValues = vi.fn().mockReturnValue(chainReturning(newResponse));
      mockTxInsert.mockReturnValue({ values: mockValues });

      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 2 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });
      mockTxSelect.mockReturnValue({ from: mockCountFrom });

      await submitPollResponse("poll-1", "c-1", "feedback", "ws-1");

      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("trims whitespace from response before inserting", async () => {
      setupTransaction();
      mockTxExecute.mockResolvedValue({
        rows: [{ id: "poll-1", status: "active", maxResponses: null }],
      });
      mockTxQueryPollResponses.findFirst.mockResolvedValue(undefined);

      const newResponse = { id: "r-1", response: "trimmed" };
      const mockValues = vi.fn().mockReturnValue(chainReturning(newResponse));
      mockTxInsert.mockReturnValue({ values: mockValues });

      await submitPollResponse("poll-1", "c-1", "  trimmed  ", "ws-1");

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ response: "trimmed" })
      );
    });
  });

  // ============ linkResponseToIdea ============

  describe("linkResponseToIdea", () => {
    it("throws NotFoundError when response is not found", async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbUpdate.mockReturnValue({ set: mockSet });

      await expect(
        linkResponseToIdea("r-x", "poll-1", "idea-1")
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when response does not belong to the poll", async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbUpdate.mockReturnValue({ set: mockSet });

      await expect(
        linkResponseToIdea("r-1", "wrong-poll", "idea-1")
      ).rejects.toThrow(NotFoundError);
    });

    it("links a response to an idea", async () => {
      const updated = { id: "r-1", linkedIdeaId: "idea-1" };
      const mockReturning = vi.fn().mockResolvedValue([updated]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbUpdate.mockReturnValue({ set: mockSet });

      const result = await linkResponseToIdea("r-1", "poll-1", "idea-1");

      expect(result).toEqual(updated);
      expect(mockSet).toHaveBeenCalledWith({ linkedIdeaId: "idea-1" });
    });

    it("unlinks a response by passing null", async () => {
      const updated = { id: "r-1", linkedIdeaId: null };
      const mockReturning = vi.fn().mockResolvedValue([updated]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbUpdate.mockReturnValue({ set: mockSet });

      const result = await linkResponseToIdea("r-1", "poll-1", null);

      expect(result).toEqual(updated);
      expect(mockSet).toHaveBeenCalledWith({ linkedIdeaId: null });
    });
  });
});

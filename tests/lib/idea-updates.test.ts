import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mock setup (hoisted so they're available in vi.mock factories) ───────────

const {
  mockFindFirst,
  mockUpdate,
  mockInsert,
  mockTransaction,
  mockTxUpdate,
  mockTxInsert,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxUpdate: vi.fn(),
  mockTxInsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      ideas: { findFirst: mockFindFirst },
    },
    update: mockUpdate,
    insert: mockInsert,
    transaction: mockTransaction,
  },
  ideas: {
    id: "id",
    workspaceId: "workspace_id",
    status: "status",
    roadmapStatus: "roadmap_status",
  },
  roadmapStatusChanges: { ideaId: "idea_id" },
  duplicateSuggestions: {
    status: "status",
    sourceIdeaId: "source_idea_id",
    duplicateIdeaId: "duplicate_idea_id",
  },
}));

vi.mock("@/lib/ai/embeddings", () => ({
  updateIdeaEmbedding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/idea-status-config", () => ({
  ALL_IDEA_STATUSES: ["UNDER_REVIEW", "PUBLISHED", "DECLINED", "MERGED"],
}));

vi.mock("@/lib/roadmap-status-config", () => ({
  ALL_ROADMAP_STATUSES: ["NONE", "PLANNED", "IN_PROGRESS", "RELEASED"],
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import {
  getIdeaWithOwnerCheck,
  updateIdea,
  deleteIdea,
} from "@/lib/idea-updates";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeIdea(overrides: Record<string, unknown> = {}) {
  return {
    id: "idea-1",
    workspaceId: "ws-1",
    title: "Test idea",
    description: "A description",
    status: "PUBLISHED",
    roadmapStatus: "NONE",
    voteCount: 3,
    internalNote: null,
    publicUpdate: null,
    showPublicUpdateOnRoadmap: false,
    featureDetails: null,
    mergedIntoId: null,
    authorEmail: "author@test.com",
    authorName: "Author",
    contributorId: "contrib-1",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    workspace: { ownerId: "user-1" },
    ...overrides,
  };
}

/** Set up the mockTxUpdate chain to return a given result from .returning() */
function setupTxUpdate(returnedIdea: Record<string, unknown>) {
  const returningFn = vi.fn().mockResolvedValue([returnedIdea]);
  const whereFn = vi.fn().mockReturnValue({ returning: returningFn });
  const setFn = vi.fn().mockReturnValue({ where: whereFn });
  mockTxUpdate.mockReturnValue({ set: setFn });
  return { setFn, whereFn, returningFn };
}

/** Set up the mockTxInsert chain */
function setupTxInsert() {
  const valuesFn = vi.fn().mockResolvedValue(undefined);
  mockTxInsert.mockReturnValue({ values: valuesFn });
  return { valuesFn };
}

/** Set up the db.update chain (used by deleteIdea) */
function setupDbUpdate() {
  const whereFn = vi.fn().mockResolvedValue(undefined);
  const setFn = vi.fn().mockReturnValue({ where: whereFn });
  mockUpdate.mockReturnValue({ set: setFn });
  return { setFn, whereFn };
}

/** Default transaction implementation */
function setupDefaultTransaction() {
  mockTransaction.mockImplementation(
    async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        update: mockTxUpdate,
        insert: mockTxInsert,
      };
      return cb(tx);
    }
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("idea-updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultTransaction();
  });

  // ── getIdeaWithOwnerCheck ─────────────────────────────────────────────

  describe("getIdeaWithOwnerCheck", () => {
    it("throws NotFoundError when idea does not exist", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      await expect(
        getIdeaWithOwnerCheck("nonexistent", "user-1")
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ForbiddenError when user does not own the workspace", async () => {
      mockFindFirst.mockResolvedValue(
        makeIdea({ workspace: { ownerId: "other-user" } })
      );

      await expect(getIdeaWithOwnerCheck("idea-1", "user-1")).rejects.toThrow(
        ForbiddenError
      );
    });

    it("returns the idea when ownership is valid", async () => {
      const idea = makeIdea();
      mockFindFirst.mockResolvedValue(idea);

      const result = await getIdeaWithOwnerCheck("idea-1", "user-1");

      expect(result).toBe(idea);
    });
  });

  // ── updateIdea — Roadmap guards ───────────────────────────────────────

  describe("updateIdea — roadmap guards", () => {
    it("throws BadRequestError for irreversibility guard (PLANNED -> NONE)", async () => {
      mockFindFirst.mockResolvedValue(makeIdea({ roadmapStatus: "PLANNED" }));

      await expect(
        updateIdea("idea-1", "user-1", { roadmapStatus: "NONE" })
      ).rejects.toThrow("Ideas cannot be removed from the roadmap");
    });

    it("allows setting roadmapStatus NONE when already NONE (no-op)", async () => {
      const idea = makeIdea({ roadmapStatus: "NONE" });
      mockFindFirst.mockResolvedValue(idea);
      setupTxUpdate({ ...idea, roadmapStatus: "NONE" });
      setupTxInsert();

      // Should not throw
      await updateIdea("idea-1", "user-1", { roadmapStatus: "NONE" });
    });

    it("throws BadRequestError when moving MERGED idea to roadmap", async () => {
      mockFindFirst.mockResolvedValue(
        makeIdea({ status: "MERGED", mergedIntoId: "idea-2" })
      );

      await expect(
        updateIdea("idea-1", "user-1", { roadmapStatus: "PLANNED" })
      ).rejects.toThrow("Cannot modify a merged idea");
    });

    it("throws BadRequestError when declining a roadmap idea", async () => {
      const idea = makeIdea({ roadmapStatus: "PLANNED" });
      mockFindFirst.mockResolvedValue(idea);

      await expect(
        updateIdea("idea-1", "user-1", { status: "DECLINED" })
      ).rejects.toThrow("Cannot decline an idea that is on the roadmap");
    });

    it("throws BadRequestError for concurrent roadmapStatus + DECLINED bypass", async () => {
      mockFindFirst.mockResolvedValue(makeIdea({ roadmapStatus: "NONE" }));

      await expect(
        updateIdea("idea-1", "user-1", {
          roadmapStatus: "PLANNED",
          status: "DECLINED",
        })
      ).rejects.toThrow("Cannot decline an idea that is on the roadmap");
    });
  });

  // ── updateIdea — Auto-publish ─────────────────────────────────────────

  describe("updateIdea — auto-publish", () => {
    it("sets status to PUBLISHED when moving UNDER_REVIEW idea to roadmap", async () => {
      const idea = makeIdea({
        status: "UNDER_REVIEW",
        roadmapStatus: "NONE",
      });
      mockFindFirst.mockResolvedValue(idea);
      const { setFn } = setupTxUpdate({
        ...idea,
        status: "PUBLISHED",
        roadmapStatus: "PLANNED",
      });
      setupTxInsert();

      await updateIdea("idea-1", "user-1", { roadmapStatus: "PLANNED" });

      const updateData = setFn.mock.calls[0][0];
      expect(updateData.status).toBe("PUBLISHED");
      expect(updateData.roadmapStatus).toBe("PLANNED");
    });

    it("does NOT change status when moving PUBLISHED idea to roadmap", async () => {
      const idea = makeIdea({
        status: "PUBLISHED",
        roadmapStatus: "NONE",
      });
      mockFindFirst.mockResolvedValue(idea);
      const { setFn } = setupTxUpdate({
        ...idea,
        roadmapStatus: "PLANNED",
      });
      setupTxInsert();

      await updateIdea("idea-1", "user-1", { roadmapStatus: "PLANNED" });

      const updateData = setFn.mock.calls[0][0];
      expect(updateData.status).toBeUndefined();
    });
  });

  // ── updateIdea — Audit logging ────────────────────────────────────────

  describe("updateIdea — audit logging", () => {
    it("inserts roadmapStatusChanges record when status changes", async () => {
      const idea = makeIdea({ roadmapStatus: "NONE" });
      mockFindFirst.mockResolvedValue(idea);
      setupTxUpdate({
        ...idea,
        roadmapStatus: "PLANNED",
      });
      const { valuesFn } = setupTxInsert();

      await updateIdea("idea-1", "user-1", { roadmapStatus: "PLANNED" });

      expect(mockTxInsert).toHaveBeenCalled();
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          ideaId: "idea-1",
          fromStatus: "NONE",
          toStatus: "PLANNED",
          changedBy: "user-1",
        })
      );
    });

    it("does NOT insert audit record when roadmapStatus stays the same", async () => {
      const idea = makeIdea({ roadmapStatus: "NONE" });
      mockFindFirst.mockResolvedValue(idea);
      setupTxUpdate({ ...idea, roadmapStatus: "NONE" });
      setupTxInsert();

      await updateIdea("idea-1", "user-1", { roadmapStatus: "NONE" });

      expect(mockTxInsert).not.toHaveBeenCalled();
    });

    it("records correct fromStatus, toStatus, changedBy for PLANNED -> IN_PROGRESS", async () => {
      const idea = makeIdea({ roadmapStatus: "PLANNED" });
      mockFindFirst.mockResolvedValue(idea);
      setupTxUpdate({
        ...idea,
        roadmapStatus: "IN_PROGRESS",
      });
      const { valuesFn } = setupTxInsert();

      await updateIdea("idea-1", "user-1", { roadmapStatus: "IN_PROGRESS" });

      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: "PLANNED",
          toStatus: "IN_PROGRESS",
          changedBy: "user-1",
        })
      );
    });
  });

  // ── updateIdea — Auto-dismiss duplicates ──────────────────────────────

  describe("updateIdea — auto-dismiss duplicates", () => {
    it("dismisses PENDING duplicateSuggestions when idea moves NONE -> PLANNED", async () => {
      const idea = makeIdea({ roadmapStatus: "NONE" });
      mockFindFirst.mockResolvedValue(idea);

      // Set up tx.update for both the idea update AND the duplicate dismiss
      const returningFn = vi
        .fn()
        .mockResolvedValue([{ ...idea, roadmapStatus: "PLANNED" }]);
      const ideaWhereFn = vi.fn().mockReturnValue({ returning: returningFn });
      const ideaSetFn = vi.fn().mockReturnValue({ where: ideaWhereFn });

      // For the duplicate dismiss update
      const dismissWhereFn = vi.fn().mockResolvedValue(undefined);
      const dismissSetFn = vi.fn().mockReturnValue({ where: dismissWhereFn });

      // tx.update returns different chains on successive calls
      mockTxUpdate
        .mockReturnValueOnce({ set: ideaSetFn })
        .mockReturnValueOnce({ set: dismissSetFn });

      setupTxInsert();

      await updateIdea("idea-1", "user-1", { roadmapStatus: "PLANNED" });

      // The second tx.update call should be for dismissing duplicates
      expect(mockTxUpdate).toHaveBeenCalledTimes(2);
      expect(dismissSetFn).toHaveBeenCalledWith({ status: "DISMISSED" });
    });

    it("does NOT dismiss when changing between roadmap statuses (PLANNED -> IN_PROGRESS)", async () => {
      const idea = makeIdea({ roadmapStatus: "PLANNED" });
      mockFindFirst.mockResolvedValue(idea);
      setupTxUpdate({
        ...idea,
        roadmapStatus: "IN_PROGRESS",
      });
      setupTxInsert();

      await updateIdea("idea-1", "user-1", { roadmapStatus: "IN_PROGRESS" });

      // tx.update should only be called once (for the idea itself, not for duplicates)
      expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // ── updateIdea — General ──────────────────────────────────────────────

  describe("updateIdea — general", () => {
    it("throws BadRequestError when status is set to MERGED", async () => {
      mockFindFirst.mockResolvedValue(makeIdea());

      await expect(
        updateIdea("idea-1", "user-1", { status: "MERGED" })
      ).rejects.toThrow("Use the merge endpoint to merge ideas");
    });

    it("throws BadRequestError when updating a MERGED idea's status", async () => {
      const idea = makeIdea({
        status: "MERGED",
        mergedIntoId: "idea-2",
        roadmapStatus: "NONE",
      });
      mockFindFirst.mockResolvedValue(idea);

      await expect(
        updateIdea("idea-1", "user-1", { status: "PUBLISHED" })
      ).rejects.toThrow("Cannot modify a merged idea");
    });

    it("calls updateIdeaEmbedding when title changes", async () => {
      const idea = makeIdea();
      mockFindFirst.mockResolvedValue(idea);
      const updatedIdea = { ...idea, title: "New title" };
      setupTxUpdate(updatedIdea);
      setupTxInsert();

      await updateIdea("idea-1", "user-1", { title: "New title" });

      expect(updateIdeaEmbedding).toHaveBeenCalledWith(
        updatedIdea.id,
        updatedIdea.title,
        updatedIdea.description
      );
    });

    it("calls updateIdeaEmbedding when description changes", async () => {
      const idea = makeIdea();
      mockFindFirst.mockResolvedValue(idea);
      const updatedIdea = { ...idea, description: "New description" };
      setupTxUpdate(updatedIdea);
      setupTxInsert();

      await updateIdea("idea-1", "user-1", {
        description: "New description",
      });

      expect(updateIdeaEmbedding).toHaveBeenCalledWith(
        updatedIdea.id,
        updatedIdea.title,
        updatedIdea.description
      );
    });

    it("does NOT call updateIdeaEmbedding for status-only changes", async () => {
      const idea = makeIdea({ status: "UNDER_REVIEW" });
      mockFindFirst.mockResolvedValue(idea);
      setupTxUpdate({ ...idea, status: "PUBLISHED" });
      setupTxInsert();

      await updateIdea("idea-1", "user-1", { status: "PUBLISHED" });

      expect(updateIdeaEmbedding).not.toHaveBeenCalled();
    });
  });

  // ── deleteIdea ────────────────────────────────────────────────────────

  describe("deleteIdea", () => {
    it("throws NotFoundError when idea does not exist", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      await expect(deleteIdea("nonexistent", "user-1")).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws ForbiddenError when user does not own the workspace", async () => {
      mockFindFirst.mockResolvedValue(
        makeIdea({ workspace: { ownerId: "other-user" } })
      );

      await expect(deleteIdea("idea-1", "user-1")).rejects.toThrow(
        ForbiddenError
      );
    });

    it("throws BadRequestError when idea is on the roadmap", async () => {
      mockFindFirst.mockResolvedValue(makeIdea({ roadmapStatus: "PLANNED" }));

      await expect(deleteIdea("idea-1", "user-1")).rejects.toThrow(
        "Cannot delete an idea that is on the roadmap"
      );
    });

    it("soft-deletes idea (sets status to DECLINED) when roadmapStatus is NONE", async () => {
      mockFindFirst.mockResolvedValue(makeIdea({ roadmapStatus: "NONE" }));
      const { setFn } = setupDbUpdate();

      await deleteIdea("idea-1", "user-1");

      expect(mockUpdate).toHaveBeenCalled();
      expect(setFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: "DECLINED" })
      );
    });
  });
});

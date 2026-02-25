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
  ideaStatusChanges: { ideaId: "idea_id" },
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
  ROADMAP_STATUS_ORDER: { NONE: 0, PLANNED: 1, IN_PROGRESS: 2, RELEASED: 3 },
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import {
  getIdeaWithOwnerCheck,
  createIdea,
  updateIdea,
  deleteIdea,
  classifyRoadmapDecision,
  classifyIdeaStatusDecision,
} from "@/lib/idea-updates";
import { updateIdeaEmbedding } from "@/lib/ai/embeddings";
import { NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";

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
    problemStatement: null,
    frequencyTag: null,
    workflowImpact: null,
    workflowStage: null,
    wontBuildReason: null,
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

/** Set up the db.insert chain (used by createIdea non-roadmap path) */
function setupDbInsert(returnedIdea: Record<string, unknown>) {
  const returningFn = vi.fn().mockResolvedValue([returnedIdea]);
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
  mockInsert.mockReturnValue({ values: valuesFn });
  return { valuesFn, returningFn };
}

/** Set up the tx.insert chain to return from .returning() (used by createIdea roadmap path) */
function setupTxInsertReturning(returnedIdea: Record<string, unknown>) {
  const returningFn = vi.fn().mockResolvedValue([returnedIdea]);
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
  // First call returns with returning (idea insert), second call returns without (audit log)
  const auditValuesFn = vi.fn().mockResolvedValue(undefined);
  mockTxInsert
    .mockReturnValueOnce({ values: valuesFn })
    .mockReturnValueOnce({ values: auditValuesFn });
  return { valuesFn, returningFn, auditValuesFn };
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

  // ── createIdea ───────────────────────────────────────────────────────

  describe("createIdea", () => {
    it("creates a regular idea without transaction when no roadmapStatus", async () => {
      const createdIdea = makeIdea({ id: "new-1", title: "My idea" });
      setupDbInsert(createdIdea);

      const result = await createIdea("ws-1", "user-1", {
        title: "My idea",
      });

      expect(result).toEqual(createdIdea);
      expect(mockInsert).toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("uses a transaction and inserts audit log when roadmapStatus is provided", async () => {
      const createdIdea = makeIdea({
        id: "new-2",
        title: "Roadmap feature",
        roadmapStatus: "PLANNED",
      });
      const { auditValuesFn } = setupTxInsertReturning(createdIdea);

      const result = await createIdea("ws-1", "user-1", {
        title: "Roadmap feature",
        roadmapStatus: "PLANNED",
      });

      expect(result).toEqual(createdIdea);
      expect(mockTransaction).toHaveBeenCalled();
      expect(auditValuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: "NONE",
          toStatus: "PLANNED",
          changedBy: "user-1",
        })
      );
    });

    it("sets featureDetails when provided for roadmap idea", async () => {
      const createdIdea = makeIdea({
        id: "new-3",
        roadmapStatus: "IN_PROGRESS",
        featureDetails: "Some specs",
      });
      const { valuesFn } = setupTxInsertReturning(createdIdea);

      await createIdea("ws-1", "user-1", {
        title: "Feature",
        roadmapStatus: "IN_PROGRESS",
        featureDetails: "Some specs",
      });

      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          featureDetails: "Some specs",
          roadmapStatus: "IN_PROGRESS",
        })
      );
    });

    it("always sets status to PUBLISHED", async () => {
      const createdIdea = makeIdea({ id: "new-4", status: "PUBLISHED" });
      const { valuesFn } = setupDbInsert(createdIdea);

      await createIdea("ws-1", "user-1", { title: "Test" });

      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PUBLISHED" })
      );
    });

    it("fires embedding generation (fire-and-forget)", async () => {
      const createdIdea = makeIdea({ id: "new-5", title: "Embed me" });
      setupDbInsert(createdIdea);

      await createIdea("ws-1", "user-1", { title: "Embed me" });

      expect(updateIdeaEmbedding).toHaveBeenCalledWith(
        "new-5",
        "Embed me",
        null
      );
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
          rationale: "test",
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

      await updateIdea("idea-1", "user-1", {
        roadmapStatus: "PLANNED",
        rationale: "test",
      });

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

      await updateIdea("idea-1", "user-1", {
        roadmapStatus: "PLANNED",
        rationale: "test",
      });

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

      await updateIdea("idea-1", "user-1", {
        roadmapStatus: "PLANNED",
        rationale: "test",
      });

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

    it("inserts ideaStatusChanges record for auto-publish (UNDER_REVIEW -> PUBLISHED)", async () => {
      const idea = makeIdea({
        status: "UNDER_REVIEW",
        roadmapStatus: "NONE",
      });
      mockFindFirst.mockResolvedValue(idea);

      // tx.update for idea update, then for duplicate dismiss
      const returningFn = vi
        .fn()
        .mockResolvedValue([
          { ...idea, status: "PUBLISHED", roadmapStatus: "PLANNED" },
        ]);
      const ideaWhereFn = vi.fn().mockReturnValue({ returning: returningFn });
      const ideaSetFn = vi.fn().mockReturnValue({ where: ideaWhereFn });
      const dismissWhereFn = vi.fn().mockResolvedValue(undefined);
      const dismissSetFn = vi.fn().mockReturnValue({ where: dismissWhereFn });
      mockTxUpdate
        .mockReturnValueOnce({ set: ideaSetFn })
        .mockReturnValueOnce({ set: dismissSetFn });

      const insertCalls: unknown[] = [];
      const valuesFn = vi.fn().mockImplementation((vals) => {
        insertCalls.push(vals);
        return Promise.resolve(undefined);
      });
      mockTxInsert.mockReturnValue({ values: valuesFn });

      await updateIdea("idea-1", "user-1", {
        roadmapStatus: "PLANNED",
        rationale: "test",
      });

      // Should have 2 inserts: roadmapStatusChanges + ideaStatusChanges
      expect(valuesFn).toHaveBeenCalledTimes(2);
      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          ideaId: "idea-1",
          fromStatus: "UNDER_REVIEW",
          toStatus: "PUBLISHED",
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

    it("inserts ideaStatusChanges for auto-publish UNDER_REVIEW -> PUBLISHED", async () => {
      const idea = makeIdea({
        status: "UNDER_REVIEW",
        roadmapStatus: "NONE",
      });
      mockFindFirst.mockResolvedValue(idea);
      setupTxUpdate({
        ...idea,
        status: "PUBLISHED",
        roadmapStatus: "PLANNED",
      });
      const { valuesFn } = setupTxInsert();

      await updateIdea("idea-1", "user-1", {
        roadmapStatus: "PLANNED",
        rationale: "test",
      });

      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          fromStatus: "UNDER_REVIEW",
          toStatus: "PUBLISHED",
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

      await updateIdea("idea-1", "user-1", {
        roadmapStatus: "PLANNED",
        rationale: "test",
      });

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
        updatedIdea.problemStatement
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
        updatedIdea.problemStatement
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
    it("always throws BadRequestError (deprecated)", () => {
      expect(() => deleteIdea()).toThrow(BadRequestError);
      expect(() => deleteIdea()).toThrow("DELETE is retired");
    });
  });

  // ── classifyRoadmapDecision ─────────────────────────────────────────

  describe("classifyRoadmapDecision", () => {
    it("returns 'prioritized' when entering roadmap (NONE → any)", () => {
      expect(classifyRoadmapDecision("NONE", "PLANNED")).toBe("prioritized");
      expect(classifyRoadmapDecision("NONE", "IN_PROGRESS")).toBe(
        "prioritized"
      );
      expect(classifyRoadmapDecision("NONE", "RELEASED")).toBe("prioritized");
    });

    it("returns 'deprioritized' when regressing (higher → lower)", () => {
      expect(classifyRoadmapDecision("IN_PROGRESS", "PLANNED")).toBe(
        "deprioritized"
      );
      expect(classifyRoadmapDecision("RELEASED", "PLANNED")).toBe(
        "deprioritized"
      );
      expect(classifyRoadmapDecision("RELEASED", "IN_PROGRESS")).toBe(
        "deprioritized"
      );
    });

    it("returns 'status_progression' for forward movement", () => {
      expect(classifyRoadmapDecision("PLANNED", "IN_PROGRESS")).toBe(
        "status_progression"
      );
      expect(classifyRoadmapDecision("IN_PROGRESS", "RELEASED")).toBe(
        "status_progression"
      );
      expect(classifyRoadmapDecision("PLANNED", "RELEASED")).toBe(
        "status_progression"
      );
    });
  });

  // ── classifyIdeaStatusDecision ──────────────────────────────────────

  describe("classifyIdeaStatusDecision", () => {
    it("returns 'declined' when target is DECLINED", () => {
      expect(classifyIdeaStatusDecision("PUBLISHED", "DECLINED")).toBe(
        "declined"
      );
      expect(classifyIdeaStatusDecision("UNDER_REVIEW", "DECLINED")).toBe(
        "declined"
      );
    });

    it("returns 'status_progression' for UNDER_REVIEW → PUBLISHED", () => {
      expect(classifyIdeaStatusDecision("UNDER_REVIEW", "PUBLISHED")).toBe(
        "status_progression"
      );
    });

    it("returns 'status_reversal' for PUBLISHED → UNDER_REVIEW", () => {
      expect(classifyIdeaStatusDecision("PUBLISHED", "UNDER_REVIEW")).toBe(
        "status_reversal"
      );
    });
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";
import type { DuplicatePair } from "@/lib/ai/similarity";

const mockExecute = vi.fn();
const mockSelect = vi.fn();

// Chainable insert mock
const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
const values = vi.fn().mockReturnValue({ onConflictDoNothing });
const insert = vi.fn().mockReturnValue({ values });

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => insert(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
  duplicateSuggestions: Symbol("duplicateSuggestions"),
}));

import {
  createDuplicateSuggestions,
  findDuplicatesInWorkspace,
  findSimilarToIdea,
} from "@/lib/ai/similarity";
import { duplicateSuggestions } from "@/lib/db";

describe("createDuplicateSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default success behavior
    onConflictDoNothing.mockResolvedValue(undefined);
    values.mockReturnValue({ onConflictDoNothing });
    insert.mockReturnValue({ values });
  });

  it("returns 0 when pairs array is empty", async () => {
    const result = await createDuplicateSuggestions("ws-1", []);

    expect(result).toBe(0);
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts each pair with correct workspace and status values", async () => {
    const pairs: DuplicatePair[] = [
      { sourceIdeaId: "idea-1", duplicateIdeaId: "idea-2", similarity: 85 },
      { sourceIdeaId: "idea-3", duplicateIdeaId: "idea-4", similarity: 72 },
    ];

    await createDuplicateSuggestions("ws-abc", pairs);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledWith(duplicateSuggestions);

    expect(values).toHaveBeenCalledWith({
      workspaceId: "ws-abc",
      sourceIdeaId: "idea-1",
      duplicateIdeaId: "idea-2",
      similarity: 85,
      status: "PENDING",
    });
    expect(values).toHaveBeenCalledWith({
      workspaceId: "ws-abc",
      sourceIdeaId: "idea-3",
      duplicateIdeaId: "idea-4",
      similarity: 72,
      status: "PENDING",
    });
  });

  it("continues when a single insert fails", async () => {
    const pairs: DuplicatePair[] = [
      { sourceIdeaId: "a", duplicateIdeaId: "b", similarity: 90 },
      { sourceIdeaId: "c", duplicateIdeaId: "d", similarity: 60 },
      { sourceIdeaId: "e", duplicateIdeaId: "f", similarity: 75 },
    ];

    // Second insert throws
    onConflictDoNothing
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("DB constraint violation"))
      .mockResolvedValueOnce(undefined);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createDuplicateSuggestions("ws-1", pairs);

    expect(result).toBe(2); // 2 succeeded, 1 failed
    expect(insert).toHaveBeenCalledTimes(3); // All 3 attempted
    expect(consoleSpy).toHaveBeenCalledOnce();

    consoleSpy.mockRestore();
  });

  it("calls onConflictDoNothing to skip existing pairs", async () => {
    const pairs: DuplicatePair[] = [
      { sourceIdeaId: "x", duplicateIdeaId: "y", similarity: 88 },
    ];

    await createDuplicateSuggestions("ws-1", pairs);

    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("returns accurate count of successfully created suggestions", async () => {
    const pairs: DuplicatePair[] = Array.from({ length: 5 }, (_, i) => ({
      sourceIdeaId: `src-${i}`,
      duplicateIdeaId: `dup-${i}`,
      similarity: 70 + i,
    }));

    // 2 out of 5 fail
    onConflictDoNothing
      .mockResolvedValueOnce(undefined) // success
      .mockRejectedValueOnce(new Error("fail")) // fail
      .mockResolvedValueOnce(undefined) // success
      .mockResolvedValueOnce(undefined) // success
      .mockRejectedValueOnce(new Error("fail")); // fail

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createDuplicateSuggestions("ws-1", pairs);

    expect(result).toBe(3);

    vi.restoreAllMocks();
  });
});

describe("findDuplicatesInWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns [] when workspace has fewer than minimum embedded ideas", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ count: 3 }] });

    const result = await findDuplicatesInWorkspace("ws-1");

    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("orients by older idea, filters existing pairs in either direction, and rounds similarity", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ count: 8 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            idea_a_id: "idea-a",
            idea_a_created_at: new Date("2025-01-10T00:00:00.000Z"),
            idea_b_id: "idea-b",
            idea_b_created_at: new Date("2025-01-01T00:00:00.000Z"),
            similarity: 0.876,
          },
          {
            idea_a_id: "idea-c",
            idea_a_created_at: new Date("2025-01-01T00:00:00.000Z"),
            idea_b_id: "idea-d",
            idea_b_created_at: new Date("2025-01-02T00:00:00.000Z"),
            similarity: 0.801,
          },
        ],
      });

    const where = vi
      .fn()
      .mockResolvedValue([
        { sourceIdeaId: "idea-b", duplicateIdeaId: "idea-a" },
      ]);
    const from = vi.fn().mockReturnValue({ where });
    mockSelect.mockReturnValue({ from });

    const result = await findDuplicatesInWorkspace("ws-1");

    expect(result).toEqual([
      {
        sourceIdeaId: "idea-c",
        duplicateIdeaId: "idea-d",
        similarity: 80,
      },
    ]);
  });
});

describe("findSimilarToIdea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps SQL rows to public shape and rounds similarity percent", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          idea_id: "idea-2",
          title: "Second idea",
          vote_count: 9,
          similarity: 0.901,
        },
        {
          idea_id: "idea-3",
          title: "Third idea",
          vote_count: 4,
          similarity: 0.556,
        },
      ],
    });

    const result = await findSimilarToIdea("idea-1", "ws-1", 2);

    expect(result).toEqual([
      { ideaId: "idea-2", title: "Second idea", voteCount: 9, similarity: 90 },
      { ideaId: "idea-3", title: "Third idea", voteCount: 4, similarity: 56 },
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

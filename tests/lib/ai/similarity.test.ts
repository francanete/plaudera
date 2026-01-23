import { vi, describe, it, expect, beforeEach } from "vitest";
import type { DuplicatePair } from "@/lib/ai/similarity";

// Chainable insert mock
const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
const values = vi.fn().mockReturnValue({ onConflictDoNothing });
const insert = vi.fn().mockReturnValue({ values });

vi.mock("@/lib/db", () => ({
  db: { insert: (...args: unknown[]) => insert(...args) },
  duplicateSuggestions: Symbol("duplicateSuggestions"),
}));

import { createDuplicateSuggestions } from "@/lib/ai/similarity";
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

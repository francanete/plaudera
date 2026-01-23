import { vi, describe, it, expect, beforeEach } from "vitest";
import type { InngestStepLike } from "@/lib/inngest/client";

// Mock all AI/DB dependencies
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockResolvedValue([]),
  },
  workspaces: {},
  ideas: { workspaceId: "workspace_id", status: "status", id: "id" },
}));

vi.mock("@/lib/ai", () => ({
  syncWorkspaceEmbeddings: vi.fn(),
  findDuplicatesInWorkspace: vi.fn(),
  createDuplicateSuggestions: vi.fn(),
  MIN_IDEAS_FOR_DETECTION: 5,
}));

import { detectDuplicatesHandler } from "@/lib/inngest/functions/detect-duplicates";
import {
  syncWorkspaceEmbeddings,
  findDuplicatesInWorkspace,
  createDuplicateSuggestions,
} from "@/lib/ai";

function createMockStep(): InngestStepLike {
  return {
    run: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
    sleep: vi.fn().mockResolvedValue(undefined),
  };
}

describe("detectDuplicatesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early when no eligible workspaces exist", async () => {
    const step = createMockStep();

    const result = await detectDuplicatesHandler(step);

    expect(result).toEqual({
      total: 0,
      processed: 0,
      embeddingsSynced: 0,
      suggestionsCreated: 0,
      errors: 0,
      message: "No eligible workspaces found",
    });
  });

  it("processes a single workspace end-to-end", async () => {
    const step = createMockStep();
    // First step.run returns eligible workspaces
    (step.run as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_name: string, fn: () => Promise<unknown>) => fn()
    );

    // Mock DB to return one workspace
    const { db } = await import("@/lib/db");
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            having: vi
              .fn()
              .mockResolvedValue([{ id: "workspace-1", ideaCount: 10 }]),
          }),
        }),
      }),
    });

    vi.mocked(syncWorkspaceEmbeddings).mockResolvedValue(3);
    vi.mocked(findDuplicatesInWorkspace).mockResolvedValue([
      { sourceIdeaId: "idea-1", duplicateIdeaId: "idea-2", similarity: 85 },
    ]);
    vi.mocked(createDuplicateSuggestions).mockResolvedValue(1);

    const result = await detectDuplicatesHandler(step);

    expect(result.total).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.embeddingsSynced).toBe(3);
    expect(result.suggestionsCreated).toBe(1);
    expect(result.errors).toBe(0);
  });

  it("continues processing when a workspace fails", async () => {
    const step = createMockStep();

    // First call fetches workspaces, subsequent calls process each
    let callCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      (_name: string, fn: () => Promise<unknown>) => {
        callCount++;
        if (callCount === 1) {
          // Return 2 workspaces
          return Promise.resolve([
            { id: "ws-1", ideaCount: 10 },
            { id: "ws-2", ideaCount: 8 },
          ]);
        }
        if (callCount === 2) {
          // First workspace throws
          return Promise.reject(new Error("API rate limit"));
        }
        // Second workspace succeeds
        return Promise.resolve({ synced: 2, created: 1 });
      }
    );

    const result = await detectDuplicatesHandler(step);

    expect(result.total).toBe(2);
    expect(result.processed).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.embeddingsSynced).toBe(2);
    expect(result.suggestionsCreated).toBe(1);
  });

  it("sleeps between batches when more than BATCH_SIZE workspaces", async () => {
    const step = createMockStep();

    // Create 12 workspaces (BATCH_SIZE = 10, so 2 batches)
    const workspaces = Array.from({ length: 12 }, (_, i) => ({
      id: `ws-${i}`,
      ideaCount: 10,
    }));

    let callCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      (_name: string, fn: () => Promise<unknown>) => {
        callCount++;
        if (callCount === 1) return Promise.resolve(workspaces);
        return Promise.resolve({ synced: 0, created: 0 });
      }
    );

    await detectDuplicatesHandler(step);

    // Should have called sleep once (between batch 1 and batch 2)
    expect(step.sleep).toHaveBeenCalledTimes(1);
    expect(step.sleep).toHaveBeenCalledWith("batch-cooldown", 5000);
  });

  it("does not sleep after the last batch", async () => {
    const step = createMockStep();

    // Exactly BATCH_SIZE workspaces (1 batch, no sleep needed)
    const workspaces = Array.from({ length: 10 }, (_, i) => ({
      id: `ws-${i}`,
      ideaCount: 6,
    }));

    let callCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      (_name: string, fn: () => Promise<unknown>) => {
        callCount++;
        if (callCount === 1) return Promise.resolve(workspaces);
        return Promise.resolve({ synced: 0, created: 0 });
      }
    );

    await detectDuplicatesHandler(step);

    expect(step.sleep).not.toHaveBeenCalled();
  });

  it("accumulates results from multiple workspaces", async () => {
    const step = createMockStep();

    let callCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      (_name: string, fn: () => Promise<unknown>) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([
            { id: "ws-1", ideaCount: 10 },
            { id: "ws-2", ideaCount: 15 },
            { id: "ws-3", ideaCount: 7 },
          ]);
        }
        // Each workspace returns different counts
        if (callCount === 2) return Promise.resolve({ synced: 5, created: 2 });
        if (callCount === 3) return Promise.resolve({ synced: 0, created: 3 });
        return Promise.resolve({ synced: 1, created: 0 });
      }
    );

    const result = await detectDuplicatesHandler(step);

    expect(result.total).toBe(3);
    expect(result.processed).toBe(3);
    expect(result.embeddingsSynced).toBe(6); // 5 + 0 + 1
    expect(result.suggestionsCreated).toBe(5); // 2 + 3 + 0
    expect(result.errors).toBe(0);
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";
import type { InngestStepLike } from "@/lib/inngest/client";

const mockUpdateIdeaEmbedding = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      workspaces: { findFirst: mockFindFirst },
    },
    select: mockSelect,
  },
  ideas: {
    id: "id",
    title: "title",
    problemStatement: "problemStatement",
    workspaceId: "workspaceId",
    status: "status",
  },
  ideaEmbeddings: { ideaId: "ideaId", problemEmbedding: "problemEmbedding" },
  workspaces: { id: "id" },
}));

vi.mock("@/lib/ai/embeddings", () => ({
  updateIdeaEmbedding: mockUpdateIdeaEmbedding,
}));

import { backfillEmbeddingsHandler } from "@/lib/inngest/functions/backfill-embeddings";

function createMockStep(): InngestStepLike {
  return {
    run: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
    sleep: vi.fn().mockResolvedValue(undefined),
  } as InngestStepLike;
}

function mockDbChain(resolvedValue: unknown) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(resolvedValue),
          }),
        }),
      }),
    }),
  });
}

describe("backfillEmbeddingsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early with error when workspace not found", async () => {
    const step = createMockStep();
    mockFindFirst.mockResolvedValue(undefined);

    const result = await backfillEmbeddingsHandler(step, "nonexistent-ws");

    expect(result).toEqual({
      totalProcessed: 0,
      totalErrors: 0,
      workspaceId: "nonexistent-ws",
      error: "Workspace not found",
    });
  });

  it("processes a single batch of ideas and returns counts", async () => {
    const step = createMockStep();
    const batch = [
      { id: "idea-1", title: "Title 1", problemStatement: "Problem 1" },
      { id: "idea-2", title: "Title 2", problemStatement: "Problem 2" },
    ];

    mockFindFirst.mockResolvedValue({ id: "ws-1" });
    // First fetch returns batch, second returns empty
    mockDbChain(batch);
    mockUpdateIdeaEmbedding.mockResolvedValue(undefined);

    let fetchCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      async (name: string, fn: () => Promise<unknown>) => {
        const result = await fn();
        if (typeof name === "string" && name.startsWith("fetch-batch")) {
          fetchCount++;
          if (fetchCount > 1) return [];
        }
        return result;
      }
    );

    const result = await backfillEmbeddingsHandler(step, "ws-1");

    expect(result.totalProcessed).toBe(2);
    expect(result.totalErrors).toBe(0);
    expect(result.workspaceId).toBe("ws-1");
    expect(mockUpdateIdeaEmbedding).toHaveBeenCalledTimes(2);
    expect(mockUpdateIdeaEmbedding).toHaveBeenCalledWith(
      "idea-1",
      "Title 1",
      "Problem 1"
    );
  });

  it("handles empty batch and returns 0/0", async () => {
    const step = createMockStep();
    mockFindFirst.mockResolvedValue({ id: "ws-1" });
    mockDbChain([]);

    const result = await backfillEmbeddingsHandler(step, "ws-1");

    expect(result).toEqual({
      totalProcessed: 0,
      totalErrors: 0,
      workspaceId: "ws-1",
    });
    expect(mockUpdateIdeaEmbedding).not.toHaveBeenCalled();
  });

  it("counts errors when updateIdeaEmbedding throws for some ideas", async () => {
    const step = createMockStep();
    const batch = [
      { id: "idea-1", title: "T1", problemStatement: "P1" },
      { id: "idea-2", title: "T2", problemStatement: "P2" },
      { id: "idea-3", title: "T3", problemStatement: "P3" },
    ];

    mockFindFirst.mockResolvedValue({ id: "ws-1" });
    mockDbChain(batch);
    mockUpdateIdeaEmbedding
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce(undefined);

    let fetchCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      async (name: string, fn: () => Promise<unknown>) => {
        const result = await fn();
        if (typeof name === "string" && name.startsWith("fetch-batch")) {
          fetchCount++;
          if (fetchCount > 1) return [];
        }
        return result;
      }
    );

    const result = await backfillEmbeddingsHandler(step, "ws-1");

    expect(result.totalProcessed).toBe(2);
    expect(result.totalErrors).toBe(1);
  });

  it("processes multiple batches when first returns BATCH_SIZE items", async () => {
    const step = createMockStep();
    const batch1 = Array.from({ length: 20 }, (_, i) => ({
      id: `idea-${i}`,
      title: `Title ${i}`,
      problemStatement: `Problem ${i}`,
    }));
    const batch2 = [
      { id: "idea-20", title: "Title 20", problemStatement: "Problem 20" },
    ];

    mockFindFirst.mockResolvedValue({ id: "ws-1" });
    mockUpdateIdeaEmbedding.mockResolvedValue(undefined);

    let fetchCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      async (name: string, fn: () => Promise<unknown>) => {
        if (typeof name === "string" && name.startsWith("fetch-batch")) {
          fetchCount++;
          // Skip actual DB call, return controlled data
          if (fetchCount === 1) return batch1;
          if (fetchCount === 2) return batch2;
          return [];
        }
        return fn();
      }
    );

    const result = await backfillEmbeddingsHandler(step, "ws-1");

    expect(result.totalProcessed).toBe(21);
    expect(result.totalErrors).toBe(0);
    expect(fetchCount).toBe(3); // batch1, batch2, empty
  });

  it("works without workspaceId (processes all workspaces)", async () => {
    const step = createMockStep();
    const batch = [{ id: "idea-1", title: "T1", problemStatement: "P1" }];

    mockDbChain(batch);
    mockUpdateIdeaEmbedding.mockResolvedValue(undefined);

    let fetchCount = 0;
    (step.run as ReturnType<typeof vi.fn>).mockImplementation(
      async (name: string, fn: () => Promise<unknown>) => {
        const result = await fn();
        if (typeof name === "string" && name.startsWith("fetch-batch")) {
          fetchCount++;
          if (fetchCount > 1) return [];
        }
        return result;
      }
    );

    const result = await backfillEmbeddingsHandler(step);

    expect(result.workspaceId).toBe("all");
    expect(result.totalProcessed).toBe(1);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });
});

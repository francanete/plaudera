import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockEmbed, mockDb } = vi.hoisted(() => {
  const mockInsertValues = vi.fn();
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  mockInsertValues.mockReturnValue({
    onConflictDoUpdate: mockOnConflictDoUpdate,
  });

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);

  const mockSelectFrom = vi.fn();
  const mockLeftJoin = vi.fn();
  const mockWhere = vi.fn();

  mockSelectFrom.mockReturnValue({ leftJoin: mockLeftJoin });
  mockLeftJoin.mockReturnValue({ where: mockWhere });
  mockWhere.mockResolvedValue([]);

  return {
    mockEmbed: vi.fn().mockResolvedValue({ embedding: Array(768).fill(0.1) }),
    mockDb: {
      insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
      insertValues: mockInsertValues,
      onConflictDoUpdate: mockOnConflictDoUpdate,
      delete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
      deleteWhere: mockDeleteWhere,
      select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
      selectFrom: mockSelectFrom,
      leftJoin: mockLeftJoin,
      where: mockWhere,
    },
  };
});

vi.mock("ai", () => ({ embed: mockEmbed }));
vi.mock("@/lib/ai", () => ({
  google: {
    textEmbeddingModel: vi.fn().mockReturnValue("mocked-model"),
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    insert: mockDb.insert,
    delete: mockDb.delete,
    select: mockDb.select,
  },
  ideaEmbeddings: { ideaId: "ideaId", id: "id" },
  ideas: {
    id: "id",
    title: "title",
    description: "description",
    workspaceId: "workspaceId",
    status: "status",
  },
}));

import {
  generateEmbedding,
  updateIdeaEmbedding,
  deleteIdeaEmbedding,
  syncWorkspaceEmbeddings,
} from "@/lib/ai/embeddings";

describe("generateEmbedding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls embed and returns the vector", async () => {
    const vector = Array(768).fill(0.5);
    mockEmbed.mockResolvedValue({ embedding: vector });

    const result = await generateEmbedding("test text");

    expect(result).toEqual(vector);
    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ value: "test text" })
    );
  });
});

describe("updateIdeaEmbedding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates embedding from title and upserts", async () => {
    await updateIdeaEmbedding("idea-1", "My Feature");

    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ value: "My Feature" })
    );
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
  });
});

describe("deleteIdeaEmbedding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes embedding by ideaId", async () => {
    await deleteIdeaEmbedding("idea-1");

    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDb.deleteWhere).toHaveBeenCalled();
  });
});

describe("syncWorkspaceEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain
    mockDb.select.mockReturnValue({ from: mockDb.selectFrom });
    mockDb.selectFrom.mockReturnValue({ leftJoin: mockDb.leftJoin });
    mockDb.leftJoin.mockReturnValue({ where: mockDb.where });
    mockDb.insert.mockReturnValue({ values: mockDb.insertValues });
    mockDb.insertValues.mockReturnValue({
      onConflictDoUpdate: mockDb.onConflictDoUpdate,
    });
  });

  it("returns 0 when no ideas need embeddings", async () => {
    mockDb.where.mockResolvedValue([]);

    const count = await syncWorkspaceEmbeddings("ws-1");

    expect(count).toBe(0);
  });

  it("creates embeddings for ideas without them", async () => {
    mockDb.where.mockResolvedValue([
      { id: "idea-1", title: "Feature A", description: "desc" },
      { id: "idea-2", title: "Feature B", description: "desc" },
    ]);

    const count = await syncWorkspaceEmbeddings("ws-1");

    expect(count).toBe(2);
    expect(mockEmbed).toHaveBeenCalledTimes(2);
  });

  it("continues on individual embedding failure", async () => {
    mockDb.where.mockResolvedValue([
      { id: "idea-1", title: "Feature A", description: "desc" },
      { id: "idea-2", title: "Feature B", description: "desc" },
      { id: "idea-3", title: "Feature C", description: "desc" },
    ]);

    // First call succeeds, second fails, third succeeds
    mockEmbed
      .mockResolvedValueOnce({ embedding: Array(768).fill(0.1) })
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce({ embedding: Array(768).fill(0.3) });

    const count = await syncWorkspaceEmbeddings("ws-1");

    expect(count).toBe(2); // 2 succeeded, 1 failed
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";

// Hoisted mocks
const { mockDb, mockAppConfig } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();

  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockResolvedValue([{ count: 0 }]);

  return {
    mockDb: { select: mockSelect, from: mockFrom, where: mockWhere },
    mockAppConfig: {
      pricing: {
        rateLimits: {
          FREE: { chat: { requestsPerDay: 10, tokensPerDay: 10000 } },
          STARTER: { chat: { requestsPerDay: 50, tokensPerDay: 50000 } },
          GROWTH: { chat: { requestsPerDay: 200, tokensPerDay: 200000 } },
          SCALE: { chat: { requestsPerDay: 1000, tokensPerDay: 1000000 } },
        },
      },
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: { select: mockDb.select },
}));
vi.mock("@/lib/db/schema", () => ({
  aiUsage: { userId: "userId", createdAt: "createdAt" },
  Plan: {},
}));
vi.mock("@/lib/config", () => ({
  appConfig: mockAppConfig,
}));

import { checkAIRateLimit } from "@/lib/rate-limit";

describe("checkAIRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default chain
    mockDb.select.mockReturnValue({ from: mockDb.from });
    mockDb.from.mockReturnValue({ where: mockDb.where });
    mockDb.where.mockResolvedValue([{ count: 0 }]);
  });

  describe("unlimited plans", () => {
    it("returns success with Infinity for non-existent plan", async () => {
      const result = await checkAIRateLimit("user-1", "ENTERPRISE");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(Infinity);
    });

    it("returns success with Infinity for non-existent feature", async () => {
      const result = await checkAIRateLimit("user-1", "FREE", "summarize");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe("under limit", () => {
    it("returns success when usage is below limit", async () => {
      mockDb.where.mockResolvedValue([{ count: 5 }]);

      const result = await checkAIRateLimit("user-1", "FREE", "chat");

      expect(result.success).toBe(true);
      // limit=10, count=5, remaining = 10 - 5 - 1 = 4
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(10);
    });

    it("returns remaining=0 when one request away from limit", async () => {
      mockDb.where.mockResolvedValue([{ count: 9 }]);

      const result = await checkAIRateLimit("user-1", "FREE", "chat");

      // count=9, limit=10 → 9 < 10 → success, remaining = 10-9-1 = 0
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe("at or over limit", () => {
    it("returns failure when at exact limit", async () => {
      mockDb.where.mockResolvedValue([{ count: 10 }]);

      const result = await checkAIRateLimit("user-1", "FREE", "chat");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(10);
    });

    it("returns failure when over limit", async () => {
      mockDb.where.mockResolvedValue([{ count: 15 }]);

      const result = await checkAIRateLimit("user-1", "FREE", "chat");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("different plans", () => {
    it("uses STARTER limit of 50", async () => {
      mockDb.where.mockResolvedValue([{ count: 30 }]);

      const result = await checkAIRateLimit("user-1", "STARTER", "chat");

      expect(result.success).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(19); // 50 - 30 - 1
    });

    it("uses SCALE limit of 1000", async () => {
      mockDb.where.mockResolvedValue([{ count: 999 }]);

      const result = await checkAIRateLimit("user-1", "SCALE", "chat");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(0); // 1000 - 999 - 1
    });
  });

  describe("fail-closed on DB error", () => {
    it("returns failure with limit=0 when DB throws", async () => {
      mockDb.where.mockRejectedValue(new Error("DB connection failed"));

      const result = await checkAIRateLimit("user-1", "FREE", "chat");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(0);
    });
  });

  describe("resetAt", () => {
    it("returns a future date (next midnight UTC)", async () => {
      const result = await checkAIRateLimit("user-1", "FREE", "chat");

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
      expect(result.resetAt.getUTCHours()).toBe(0);
      expect(result.resetAt.getUTCMinutes()).toBe(0);
    });
  });
});

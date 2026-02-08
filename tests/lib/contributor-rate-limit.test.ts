import { vi, describe, it, expect, beforeEach } from "vitest";

// Track upserted rows in a simple map to simulate DB behavior
const mockRows = vi.hoisted(
  () => new Map<string, { count: number; windowStart: Date }>()
);

const mockReturning = vi.hoisted(() => vi.fn());
const mockOnConflictDoUpdate = vi.hoisted(() =>
  vi.fn().mockReturnValue({ returning: mockReturning })
);
const mockValues = vi.hoisted(() =>
  vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })
);
const mockInsert = vi.hoisted(() =>
  vi.fn().mockReturnValue({ values: mockValues })
);

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  rateLimits: {
    key: "key",
    windowStart: "window_start",
    count: "count",
  },
}));

// Mock drizzle-orm sql and eq
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gt: vi.fn(),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    _tag: "sql",
    strings,
    values,
  }),
}));

/**
 * Simulate upsert behavior: the mockReturning implementation inspects
 * the values/onConflictDoUpdate args to produce correct row state.
 */
function setupDbSimulation() {
  mockReturning.mockImplementation(function () {
    // Get what was passed to values() and onConflictDoUpdate()
    const valuesArg =
      mockValues.mock.calls[mockValues.mock.calls.length - 1][0];
    const conflictArg =
      mockOnConflictDoUpdate.mock.calls[
        mockOnConflictDoUpdate.mock.calls.length - 1
      ][0];
    const key = valuesArg.key as string;
    const now = valuesArg.windowStart as Date;

    const existing = mockRows.get(key);

    if (!existing) {
      // New row — insert
      const row = { count: 1, windowStart: now };
      mockRows.set(key, row);
      return Promise.resolve([row]);
    }

    // Existing row — check if window expired by evaluating the CASE expression
    // The sql template for windowStart contains: CASE WHEN windowStart < windowStart THEN ${now} ELSE ${rateLimits.windowStart} END
    // We need to extract the windowMs threshold from the set's windowStart sql template
    // The set.count sql has: CASE WHEN ${rateLimits.windowStart} < ${windowStart} THEN 1 ELSE ${rateLimits.count} + 1 END
    // windowStart in the sql is the cutoff (now - windowMs)
    const countSql = conflictArg.set.count;
    const windowCutoff = countSql.values[1] as Date; // second interpolated value is the windowStart cutoff

    if (existing.windowStart < windowCutoff) {
      // Window expired — reset
      const row = { count: 1, windowStart: now };
      mockRows.set(key, row);
      return Promise.resolve([row]);
    }

    // Window still active — increment
    existing.count += 1;
    return Promise.resolve([
      { count: existing.count, windowStart: existing.windowStart },
    ]);
  });
}

import {
  checkEmailRateLimit,
  checkIdeaRateLimit,
  checkVoteRateLimit,
  checkIdentifyRateLimit,
} from "@/lib/contributor-rate-limit";

describe("contributor-rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRows.clear();
    setupDbSimulation();
    vi.useFakeTimers();
  });

  describe("checkEmailRateLimit", () => {
    it("allows first request", async () => {
      const result = await checkEmailRateLimit("192.168.1.1");
      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeUndefined();
    });

    it("allows requests up to limit (5)", async () => {
      for (let i = 0; i < 5; i++) {
        const result = await checkEmailRateLimit("192.168.1.2");
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects request over limit with resetAt", async () => {
      for (let i = 0; i < 5; i++) {
        await checkEmailRateLimit("192.168.1.3");
      }
      const result = await checkEmailRateLimit("192.168.1.3");
      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("resets counter after window expires", async () => {
      for (let i = 0; i < 5; i++) {
        await checkEmailRateLimit("192.168.1.4");
      }
      expect((await checkEmailRateLimit("192.168.1.4")).allowed).toBe(false);

      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const result = await checkEmailRateLimit("192.168.1.4");
      expect(result.allowed).toBe(true);
    });

    it("tracks different IPs independently", async () => {
      for (let i = 0; i < 5; i++) {
        await checkEmailRateLimit("ip1");
      }
      expect((await checkEmailRateLimit("ip1")).allowed).toBe(false);
      expect((await checkEmailRateLimit("ip2")).allowed).toBe(true);
    });
  });

  describe("checkIdeaRateLimit", () => {
    it("allows requests up to limit (10)", async () => {
      for (let i = 0; i < 10; i++) {
        const result = await checkIdeaRateLimit("contributor-2");
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects request over limit", async () => {
      for (let i = 0; i < 10; i++) {
        await checkIdeaRateLimit("contributor-3");
      }
      const result = await checkIdeaRateLimit("contributor-3");
      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("tracks different contributors independently", async () => {
      for (let i = 0; i < 10; i++) {
        await checkIdeaRateLimit("contributor-a");
      }
      expect((await checkIdeaRateLimit("contributor-a")).allowed).toBe(false);
      expect((await checkIdeaRateLimit("contributor-b")).allowed).toBe(true);
    });
  });

  describe("checkVoteRateLimit", () => {
    it("allows requests up to limit (60)", async () => {
      for (let i = 0; i < 60; i++) {
        const result = await checkVoteRateLimit("voter-2");
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects request over limit", async () => {
      for (let i = 0; i < 60; i++) {
        await checkVoteRateLimit("voter-3");
      }
      const result = await checkVoteRateLimit("voter-3");
      expect(result.allowed).toBe(false);
    });
  });

  describe("checkIdentifyRateLimit", () => {
    it("allows requests up to limit (20)", async () => {
      for (let i = 0; i < 20; i++) {
        const result = await checkIdentifyRateLimit("10.0.0.2");
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects request over limit", async () => {
      for (let i = 0; i < 20; i++) {
        await checkIdentifyRateLimit("10.0.0.3");
      }
      const result = await checkIdentifyRateLimit("10.0.0.3");
      expect(result.allowed).toBe(false);
    });

    it("tracks different IPs independently", async () => {
      for (let i = 0; i < 20; i++) {
        await checkIdentifyRateLimit("identify-ip1");
      }
      expect((await checkIdentifyRateLimit("identify-ip1")).allowed).toBe(
        false
      );
      expect((await checkIdentifyRateLimit("identify-ip2")).allowed).toBe(true);
    });
  });

  describe("fail-closed behavior", () => {
    it("blocks requests when DB is unreachable", async () => {
      mockReturning.mockRejectedValueOnce(new Error("connection refused"));
      const result = await checkEmailRateLimit("192.168.1.1");
      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });
});

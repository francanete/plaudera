import { vi, describe, it, expect, beforeEach } from "vitest";

// ============ Mock Functions ============
const mockSelectTrials = vi.fn();
const mockSelectUsers = vi.fn();
const mockSendTransactionalEmail = vi.fn();

// ============ Mock all dependencies before import ============

// Mock subscription module (imported by functions.ts)
vi.mock("@/lib/subscription", () => ({
  syncWithPolar: vi.fn(),
}));

// Mock email module
vi.mock("@/lib/email", () => ({
  sendAccountSetupEmail: vi.fn(),
}));

// Mock inngest client
vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    createFunction: vi.fn((config, trigger, handler) => ({
      config,
      trigger,
      handler,
    })),
  },
}));

// ============ Mock db with chained select pattern ============
let selectCallCount = 0;

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => {
      selectCallCount++;
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => {
            // First call is for subscriptions (trials), subsequent calls are for users
            if (selectCallCount === 1) {
              return mockSelectTrials();
            }
            return mockSelectUsers();
          }),
        })),
      };
    }),
  },
  users: { id: "id", email: "email", name: "name" },
  subscriptions: {
    userId: "user_id",
    status: "status",
    billingType: "billing_type",
    currentPeriodEnd: "current_period_end",
    plan: "plan",
  },
}));

vi.mock("@/lib/email-sequences", () => ({
  sendTransactionalEmail: (params: unknown) =>
    mockSendTransactionalEmail(params),
}));

vi.mock("@/lib/config", () => ({
  appConfig: {
    plans: {
      hierarchy: ["FREE", "STARTER", "GROWTH", "SCALE"],
    },
    pricing: {
      tiers: {
        STARTER: {
          marketing: { name: "Starter" },
          prices: { monthly: 2400, annual: 24000 },
        },
        GROWTH: {
          marketing: { name: "Growth" },
          prices: { monthly: 4900, annual: 49000 },
        },
        SCALE: {
          marketing: { name: "Scale" },
          prices: { monthly: 9900, annual: 99000 },
        },
      },
    },
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    inArray: vi.fn(),
  };
});

// Import after mocks are set up
import {
  trialEndingReminderHandler,
  type InngestStepLike,
} from "@/lib/inngest/functions";

// ============ Mock step object ============
function createMockStep(): InngestStepLike {
  return {
    run: vi.fn((_name: string, fn: () => Promise<unknown>) =>
      fn()
    ) as InngestStepLike["run"],
    sleep: vi.fn().mockResolvedValue(undefined),
  };
}

describe("trialEndingReminderHandler", () => {
  let mockStep: InngestStepLike;

  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockStep = createMockStep();
  });

  describe("no trials found", () => {
    it("returns early with zero counts when no trials ending soon", async () => {
      mockSelectTrials.mockResolvedValue([]);

      const result = await trialEndingReminderHandler(mockStep);

      expect(result).toEqual({
        sent: 0,
        skipped: 0,
        errors: 0,
        message: "No trials ending soon",
      });
      expect(mockStep.run).toHaveBeenCalledTimes(1);
      expect(mockStep.run).toHaveBeenCalledWith(
        "fetch-trials",
        expect.any(Function)
      );
      expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("sends email when trial and user found", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: trialEndDate },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "test@example.com", name: "Test User" },
      ]);
      mockSendTransactionalEmail.mockResolvedValue({ sent: true });

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.total).toBe(1);
      expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          email: "test@example.com",
          name: "Test User",
          emailKey: "trial_ending_24h",
          templateData: expect.objectContaining({
            planName: "Starter",
            price: "$24/month",
          }),
        })
      );
    });

    it("processes multiple trials in single batch", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: trialEndDate },
        { userId: "user-2", plan: "GROWTH", currentPeriodEnd: trialEndDate },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "user1@example.com", name: "User 1" },
        { id: "user-2", email: "user2@example.com", name: "User 2" },
      ]);
      mockSendTransactionalEmail.mockResolvedValue({ sent: true });

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.sent).toBe(2);
      expect(result.total).toBe(2);
      expect(mockSendTransactionalEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe("user not found (N+1 fix validation)", () => {
    it("skips trial when user not in batch query result", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: trialEndDate },
        { userId: "user-2", plan: "STARTER", currentPeriodEnd: trialEndDate },
      ]);
      // Only return user-1, user-2 is missing from the batch query
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "user1@example.com", name: "User 1" },
      ]);
      mockSendTransactionalEmail.mockResolvedValue({ sent: true });

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
      expect(mockSendTransactionalEmail).toHaveBeenCalledTimes(1);
    });

    it("skips all trials when no users found", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: trialEndDate },
      ]);
      mockSelectUsers.mockResolvedValue([]); // No users found

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
    });
  });

  describe("email send failures", () => {
    it("counts as skipped when email returns sent: false", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: trialEndDate },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "test@example.com", name: "Test" },
      ]);
      mockSendTransactionalEmail.mockResolvedValue({
        sent: false,
        reason: "already_sent",
      });

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
    });

    it("counts as error when email throws exception", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: trialEndDate },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "test@example.com", name: "Test" },
      ]);
      mockSendTransactionalEmail.mockRejectedValue(new Error("SMTP failure"));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to send trial ending email for user user-1"
        ),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("handles mixed results correctly", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: trialEndDate },
        { userId: "user-2", plan: "STARTER", currentPeriodEnd: trialEndDate },
        { userId: "user-3", plan: "STARTER", currentPeriodEnd: trialEndDate },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "user1@example.com", name: "User 1" },
        { id: "user-2", email: "user2@example.com", name: "User 2" },
        // user-3 missing
      ]);
      mockSendTransactionalEmail
        .mockResolvedValueOnce({ sent: true }) // user-1 succeeds
        .mockRejectedValueOnce(new Error("Failed")); // user-2 throws

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.sent).toBe(1); // user-1
      expect(result.skipped).toBe(1); // user-3 not found
      expect(result.errors).toBe(1); // user-2 threw
      expect(result.total).toBe(3);

      consoleSpy.mockRestore();
    });
  });

  describe("fallback values", () => {
    it("uses plan key as fallback when tier config not found", async () => {
      const trialEndDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        {
          userId: "user-1",
          plan: "UNKNOWN_PLAN",
          currentPeriodEnd: trialEndDate,
        },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "test@example.com", name: "Test" },
      ]);
      mockSendTransactionalEmail.mockResolvedValue({ sent: true });

      await trialEndingReminderHandler(mockStep);

      expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            planName: "UNKNOWN_PLAN",
            price: "your subscription price",
          }),
        })
      );
    });

    it("uses 'soon' as fallback when currentPeriodEnd is null", async () => {
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: null },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "test@example.com", name: "Test" },
      ]);
      mockSendTransactionalEmail.mockResolvedValue({ sent: true });

      await trialEndingReminderHandler(mockStep);

      expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            endDate: "soon",
          }),
        })
      );
    });
  });

  describe("batch processing", () => {
    it("reports correct batch count for single batch", async () => {
      const trials = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        plan: "STARTER",
        currentPeriodEnd: new Date("2026-01-20T12:00:00Z"),
      }));
      mockSelectTrials.mockResolvedValue(trials);
      mockSelectUsers.mockResolvedValue(
        trials.map((t) => ({
          id: t.userId,
          email: `${t.userId}@example.com`,
          name: "Test",
        }))
      );
      mockSendTransactionalEmail.mockResolvedValue({ sent: true });

      const result = await trialEndingReminderHandler(mockStep);

      expect(result.total).toBe(10);
      expect(result.sent).toBe(10);
      expect(result.batches).toBe(1);
      // No sleep for single batch
      expect(mockStep.sleep).not.toHaveBeenCalled();
    });
  });

  describe("date formatting", () => {
    it("formats date in human-readable format", async () => {
      const testDate = new Date("2026-01-20T12:00:00Z");
      mockSelectTrials.mockResolvedValue([
        { userId: "user-1", plan: "STARTER", currentPeriodEnd: testDate },
      ]);
      mockSelectUsers.mockResolvedValue([
        { id: "user-1", email: "test@example.com", name: "Test" },
      ]);
      mockSendTransactionalEmail.mockResolvedValue({ sent: true });

      await trialEndingReminderHandler(mockStep);

      expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            endDate: expect.stringContaining("January"),
          }),
        })
      );
    });
  });
});

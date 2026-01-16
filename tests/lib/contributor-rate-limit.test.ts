import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("contributor-rate-limit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkEmailRateLimit", () => {
    it("allows first request", async () => {
      const { checkEmailRateLimit } =
        await import("@/lib/contributor-rate-limit");

      const result = checkEmailRateLimit("192.168.1.1");

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeUndefined();
    });

    it("allows requests up to limit (5)", async () => {
      const { checkEmailRateLimit } =
        await import("@/lib/contributor-rate-limit");

      for (let i = 0; i < 5; i++) {
        const result = checkEmailRateLimit("192.168.1.2");
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects request over limit with resetAt", async () => {
      const { checkEmailRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all 5 requests
      for (let i = 0; i < 5; i++) {
        checkEmailRateLimit("192.168.1.3");
      }

      // 6th request should be rejected
      const result = checkEmailRateLimit("192.168.1.3");

      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("resets counter after window expires", async () => {
      const { checkEmailRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all 5 requests
      for (let i = 0; i < 5; i++) {
        checkEmailRateLimit("192.168.1.4");
      }

      // Verify 6th is rejected
      expect(checkEmailRateLimit("192.168.1.4").allowed).toBe(false);

      // Advance time past 1 hour window
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      // Should allow again
      const result = checkEmailRateLimit("192.168.1.4");
      expect(result.allowed).toBe(true);
    });

    it("tracks different IPs independently", async () => {
      const { checkEmailRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all requests for IP1
      for (let i = 0; i < 5; i++) {
        checkEmailRateLimit("ip1");
      }
      expect(checkEmailRateLimit("ip1").allowed).toBe(false);

      // IP2 should still be allowed
      const result = checkEmailRateLimit("ip2");
      expect(result.allowed).toBe(true);
    });
  });

  describe("checkIdeaRateLimit", () => {
    it("allows first request", async () => {
      const { checkIdeaRateLimit } =
        await import("@/lib/contributor-rate-limit");

      const result = checkIdeaRateLimit("contributor-1");

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeUndefined();
    });

    it("allows requests up to limit (10)", async () => {
      const { checkIdeaRateLimit } =
        await import("@/lib/contributor-rate-limit");

      for (let i = 0; i < 10; i++) {
        const result = checkIdeaRateLimit("contributor-2");
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects request over limit with resetAt", async () => {
      const { checkIdeaRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all 10 requests
      for (let i = 0; i < 10; i++) {
        checkIdeaRateLimit("contributor-3");
      }

      // 11th request should be rejected
      const result = checkIdeaRateLimit("contributor-3");

      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("resets counter after window expires (1 hour)", async () => {
      const { checkIdeaRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all 10 requests
      for (let i = 0; i < 10; i++) {
        checkIdeaRateLimit("contributor-4");
      }

      // Verify 11th is rejected
      expect(checkIdeaRateLimit("contributor-4").allowed).toBe(false);

      // Advance time past 1 hour window
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      // Should allow again
      const result = checkIdeaRateLimit("contributor-4");
      expect(result.allowed).toBe(true);
    });

    it("tracks different contributors independently", async () => {
      const { checkIdeaRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all requests for contributor A
      for (let i = 0; i < 10; i++) {
        checkIdeaRateLimit("contributor-a");
      }
      expect(checkIdeaRateLimit("contributor-a").allowed).toBe(false);

      // Contributor B should still be allowed
      const result = checkIdeaRateLimit("contributor-b");
      expect(result.allowed).toBe(true);
    });
  });

  describe("checkVoteRateLimit", () => {
    it("allows first request", async () => {
      const { checkVoteRateLimit } =
        await import("@/lib/contributor-rate-limit");

      const result = checkVoteRateLimit("voter-1");

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeUndefined();
    });

    it("allows requests up to limit (60)", async () => {
      const { checkVoteRateLimit } =
        await import("@/lib/contributor-rate-limit");

      for (let i = 0; i < 60; i++) {
        const result = checkVoteRateLimit("voter-2");
        expect(result.allowed).toBe(true);
      }
    });

    it("rejects request over limit with resetAt", async () => {
      const { checkVoteRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all 60 requests
      for (let i = 0; i < 60; i++) {
        checkVoteRateLimit("voter-3");
      }

      // 61st request should be rejected
      const result = checkVoteRateLimit("voter-3");

      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("resets counter after window expires (1 minute)", async () => {
      const { checkVoteRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all 60 requests
      for (let i = 0; i < 60; i++) {
        checkVoteRateLimit("voter-4");
      }

      // Verify 61st is rejected
      expect(checkVoteRateLimit("voter-4").allowed).toBe(false);

      // Advance time past 1 minute window
      vi.advanceTimersByTime(60 * 1000 + 1);

      // Should allow again
      const result = checkVoteRateLimit("voter-4");
      expect(result.allowed).toBe(true);
    });

    it("tracks different voters independently", async () => {
      const { checkVoteRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Use up all requests for voter A
      for (let i = 0; i < 60; i++) {
        checkVoteRateLimit("voter-a");
      }
      expect(checkVoteRateLimit("voter-a").allowed).toBe(false);

      // Voter B should still be allowed
      const result = checkVoteRateLimit("voter-b");
      expect(result.allowed).toBe(true);
    });

    it("has shorter window than ideas (1 min vs 1 hour)", async () => {
      const { checkVoteRateLimit, checkIdeaRateLimit } =
        await import("@/lib/contributor-rate-limit");

      // Exhaust both limiters
      for (let i = 0; i < 60; i++) {
        checkVoteRateLimit("combo-user");
      }
      for (let i = 0; i < 10; i++) {
        checkIdeaRateLimit("combo-user");
      }

      // Both should be blocked
      expect(checkVoteRateLimit("combo-user").allowed).toBe(false);
      expect(checkIdeaRateLimit("combo-user").allowed).toBe(false);

      // Advance 1 minute - vote should reset, idea should not
      vi.advanceTimersByTime(60 * 1000 + 1);

      expect(checkVoteRateLimit("combo-user").allowed).toBe(true);
      expect(checkIdeaRateLimit("combo-user").allowed).toBe(false);

      // Advance to 1 hour total - now idea should also reset
      vi.advanceTimersByTime(59 * 60 * 1000);

      expect(checkIdeaRateLimit("combo-user").allowed).toBe(true);
    });
  });
});

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Store original env
const originalEnv = process.env;

describe("unsubscribe-token", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      BETTER_AUTH_SECRET: "test-secret-key-for-signing-tokens",
      NEXT_PUBLIC_APP_URL: "https://testapp.com",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateUnsubscribeToken", () => {
    it("generates a valid base64url token", async () => {
      const { generateUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const token = generateUnsubscribeToken("test@example.com");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      // Base64url should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });

    it("generates different tokens for different emails", async () => {
      const { generateUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const token1 = generateUnsubscribeToken("user1@example.com");
      const token2 = generateUnsubscribeToken("user2@example.com");

      expect(token1).not.toBe(token2);
    });

    it("throws when BETTER_AUTH_SECRET is not set", async () => {
      delete process.env.BETTER_AUTH_SECRET;
      vi.resetModules();

      const { generateUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      expect(() => generateUnsubscribeToken("test@example.com")).toThrow(
        "BETTER_AUTH_SECRET must be set"
      );
    });
  });

  describe("verifyUnsubscribeToken", () => {
    it("returns email for valid token", async () => {
      const { generateUnsubscribeToken, verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const email = "test@example.com";
      const token = generateUnsubscribeToken(email);
      const result = verifyUnsubscribeToken(token);

      expect(result).toBe(email);
    });

    it("returns null for expired token", async () => {
      const { verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      // Manually create an expired token (expiry in the past)
      const crypto = await import("crypto");
      const email = "test@example.com";
      const expiry = Date.now() - 1000; // 1 second ago
      const payload = `${email}|${expiry}`;
      const signature = crypto
        .createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(payload)
        .digest("base64url");
      const expiredToken = Buffer.from(`${payload}|${signature}`).toString(
        "base64url"
      );

      const result = verifyUnsubscribeToken(expiredToken);

      expect(result).toBeNull();
    });

    it("returns null for tampered token", async () => {
      const { generateUnsubscribeToken, verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const token = generateUnsubscribeToken("test@example.com");
      // Decode, modify, and re-encode
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split("|");
      parts[0] = "hacker@evil.com"; // Change email
      const tamperedToken = Buffer.from(parts.join("|")).toString("base64url");

      const result = verifyUnsubscribeToken(tamperedToken);

      expect(result).toBeNull();
    });

    it("returns null for malformed token (wrong format)", async () => {
      const { verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const malformedToken =
        Buffer.from("just-some-garbage").toString("base64url");

      const result = verifyUnsubscribeToken(malformedToken);

      expect(result).toBeNull();
    });

    it("returns null for invalid base64 token", async () => {
      const { verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const result = verifyUnsubscribeToken("not-base64!!!");

      expect(result).toBeNull();
    });

    it("returns null for empty token", async () => {
      const { verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const result = verifyUnsubscribeToken("");

      expect(result).toBeNull();
    });
  });

  describe("generateUnsubscribeUrl", () => {
    it("returns full URL with token", async () => {
      const { generateUnsubscribeUrl, verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const url = generateUnsubscribeUrl("test@example.com");

      expect(url).toMatch(/^https:\/\/testapp\.com\/api\/unsubscribe\?token=/);

      // Extract and verify the token from URL
      const token = url.split("token=")[1];
      const email = verifyUnsubscribeToken(token);
      expect(email).toBe("test@example.com");
    });
  });

  describe("security properties", () => {
    it("cannot forge token for different email", async () => {
      const { generateUnsubscribeToken, verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      // Generate token for one email
      const token = generateUnsubscribeToken("user@example.com");

      // Try to extract and modify to a different email
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const [, expiry, signature] = decoded.split("|");

      // Create fake token with different email but same signature
      const fakePayload = `attacker@evil.com|${expiry}|${signature}`;
      const fakeToken = Buffer.from(fakePayload).toString("base64url");

      // Should not validate
      const result = verifyUnsubscribeToken(fakeToken);
      expect(result).toBeNull();
    });

    it("handles special characters in email", async () => {
      const { generateUnsubscribeToken, verifyUnsubscribeToken } =
        await import("@/lib/unsubscribe-token");

      const email = "user+tag@example.com";
      const token = generateUnsubscribeToken(email);
      const result = verifyUnsubscribeToken(token);

      expect(result).toBe(email);
    });
  });
});

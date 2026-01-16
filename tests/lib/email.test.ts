import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock resend with proper class syntax
const mockSend = vi.fn().mockResolvedValue({ data: { id: "resend-id-123" } });
vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: mockSend };
  },
}));

vi.mock("@/lib/config", () => ({
  appConfig: {
    email: {
      from: "test@testapp.com",
    },
  },
}));

describe("sendEmail", () => {
  const emailParams = {
    to: "user@example.com",
    subject: "Test Subject",
    html: "<p>Test content</p>",
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("production environment", () => {
    it("throws error in production when RESEND_API_KEY is missing", async () => {
      vi.stubEnv("RESEND_API_KEY", undefined);
      vi.stubEnv("NODE_ENV", "production");

      const { sendEmail } = await import("@/lib/email");

      await expect(sendEmail(emailParams)).rejects.toThrow(
        "RESEND_API_KEY is not configured"
      );
    });

    it("throws error with specific message mentioning production", async () => {
      vi.stubEnv("RESEND_API_KEY", undefined);
      vi.stubEnv("NODE_ENV", "production");

      const { sendEmail } = await import("@/lib/email");

      await expect(sendEmail(emailParams)).rejects.toThrow(/production/i);
    });
  });

  describe("development environment", () => {
    it("returns dev-mode ID when RESEND_API_KEY is missing in development", async () => {
      vi.stubEnv("RESEND_API_KEY", undefined);
      vi.stubEnv("NODE_ENV", "development");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { sendEmail } = await import("@/lib/email");

      const result = await sendEmail(emailParams);

      expect(result).toEqual({ id: "dev-mode" });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping send"),
        expect.objectContaining({ to: "user@example.com" })
      );

      consoleSpy.mockRestore();
    });

    it("returns dev-mode ID when NODE_ENV is not set (defaults to non-production)", async () => {
      vi.stubEnv("RESEND_API_KEY", undefined);
      vi.stubEnv("NODE_ENV", undefined);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { sendEmail } = await import("@/lib/email");

      const result = await sendEmail(emailParams);

      expect(result).toEqual({ id: "dev-mode" });

      consoleSpy.mockRestore();
    });
  });

  describe("with valid API key", () => {
    it("sends email via Resend when API key is present", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key");
      vi.stubEnv("NODE_ENV", "production");

      const { sendEmail } = await import("@/lib/email");
      const result = await sendEmail(emailParams);

      expect(result).toEqual({ id: "resend-id-123" });
    });

    it("uses default from address from config", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key");
      mockSend.mockClear();

      const { sendEmail } = await import("@/lib/email");

      await sendEmail(emailParams);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "test@testapp.com",
        })
      );
    });

    it("uses custom from address when provided", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key");
      mockSend.mockClear();

      const { sendEmail } = await import("@/lib/email");

      await sendEmail({ ...emailParams, from: "custom@testapp.com" });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "custom@testapp.com",
        })
      );
    });

    it("handles array of recipients", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key");
      mockSend.mockClear();

      const { sendEmail } = await import("@/lib/email");

      await sendEmail({
        ...emailParams,
        to: ["user1@example.com", "user2@example.com"],
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["user1@example.com", "user2@example.com"],
        })
      );
    });
  });

  describe("error handling", () => {
    it("throws and logs error when Resend returns error", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key");

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock send to return an error
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Rate limit exceeded" },
      });

      const { sendEmail } = await import("@/lib/email");

      await expect(sendEmail(emailParams)).rejects.toEqual({
        message: "Rate limit exceeded",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Email send error:",
        expect.objectContaining({ message: "Rate limit exceeded" })
      );

      consoleSpy.mockRestore();
    });
  });
});

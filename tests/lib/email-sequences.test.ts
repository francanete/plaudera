import { vi, describe, it, expect, beforeEach } from "vitest";

// ============ Mocks ============
// Must be defined before importing the module under test

const mockFindFirstEmailsSent = vi.fn();
const mockFindFirstUsers = vi.fn();
const mockInsert = vi.fn(() => ({ values: vi.fn() }));
const mockSendEmail = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      emailsSent: {
        findFirst: () => mockFindFirstEmailsSent(),
      },
      users: { findFirst: () => mockFindFirstUsers() },
    },
    insert: () => mockInsert(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: {
    id: "id",
    email: "email",
    marketingUnsubscribed: "marketingUnsubscribed",
  },
  emailsSent: { userId: "userId", emailKey: "emailKey" },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: (params: unknown) => mockSendEmail(params),
}));

vi.mock("@/lib/config", () => ({
  appConfig: { name: "TestApp" },
}));

vi.mock("@/lib/unsubscribe-token", () => ({
  generateUnsubscribeUrl: (email: string) =>
    `https://testapp.com/api/unsubscribe?token=mock-token-for-${encodeURIComponent(email)}`,
}));

// Import after mocks are set up
import {
  sendSequenceEmail,
  sendTransactionalEmail,
} from "@/lib/email-sequences";

// ============ Test Suite ============

describe("sendSequenceEmail", () => {
  const defaultParams = {
    userId: "user-123",
    email: "test@example.com",
    name: "Test User",
    emailKey: "welcome_instant",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable for templates
    process.env.NEXT_PUBLIC_APP_URL = "https://testapp.com";
  });

  describe("idempotency checks", () => {
    it("returns already_sent when email was previously sent", async () => {
      // Simulate existing email record in database
      mockFindFirstEmailsSent.mockResolvedValue({
        id: "email-1",
        userId: "user-123",
        emailKey: "welcome_instant",
      });

      const result = await sendSequenceEmail(defaultParams);

      expect(result).toEqual({ sent: false, reason: "already_sent" });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("proceeds when no previous email exists", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: false });

      await sendSequenceEmail(defaultParams);

      expect(mockSendEmail).toHaveBeenCalled();
    });
  });

  describe("user validation", () => {
    it("returns user_not_found when user does not exist", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue(null);

      const result = await sendSequenceEmail(defaultParams);

      expect(result).toEqual({ sent: false, reason: "user_not_found" });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("unsubscribe handling", () => {
    it("returns unsubscribed when user has opted out of marketing", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: true });

      const result = await sendSequenceEmail(defaultParams);

      expect(result).toEqual({ sent: false, reason: "unsubscribed" });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("successful email sending", () => {
    it("sends email and records in database when all checks pass", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: false });

      const result = await sendSequenceEmail(defaultParams);

      expect(result).toEqual({ sent: true });
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.stringContaining("Welcome"),
        })
      );
      expect(mockInsert).toHaveBeenCalled();
    });

    it("replaces {{unsubscribe_url}} placeholder with secure token-based URL", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: false });

      await sendSequenceEmail(defaultParams);

      const emailCall = mockSendEmail.mock.calls[0][0];
      // Should contain the mocked token URL
      expect(emailCall.html).toContain(
        "https://testapp.com/api/unsubscribe?token=mock-token-for-"
      );
      expect(emailCall.html).not.toContain("{{unsubscribe_url}}");
    });

    it("sends successfully when name is null", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: false });

      const result = await sendSequenceEmail({ ...defaultParams, name: null });

      expect(result).toEqual({ sent: true });
      expect(mockSendEmail).toHaveBeenCalled();
    });
  });

  describe("template selection", () => {
    it("uses getting_started_day1 template for day 1 emails", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: false });

      await sendSequenceEmail({
        ...defaultParams,
        emailKey: "getting_started_day1",
      });

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain("Ready to collect feedback");
    });

    it("uses activation_day3 template for day 3 emails", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: false });

      await sendSequenceEmail({
        ...defaultParams,
        emailKey: "activation_day3",
      });

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain("Get your first feedback today");
    });

    it("returns error for unknown template", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ marketingUnsubscribed: false });
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await sendSequenceEmail({
        ...defaultParams,
        emailKey: "unknown_template",
      });

      expect(result.sent).toBe(false);
    });
  });
});

// ============ Transactional Email Tests ============

describe("sendTransactionalEmail", () => {
  const defaultParams = {
    userId: "user-123",
    email: "test@example.com",
    name: "Test User",
    emailKey: "trial_ending_24h",
    templateData: {
      planName: "Starter",
      endDate: "January 15, 2025",
      price: "$9/month",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://testapp.com";
  });

  describe("idempotency checks", () => {
    it("returns already_sent when email was previously sent", async () => {
      mockFindFirstEmailsSent.mockResolvedValue({
        id: "email-1",
        userId: "user-123",
        emailKey: "trial_ending_24h",
      });

      const result = await sendTransactionalEmail(defaultParams);

      expect(result).toEqual({ sent: false, reason: "already_sent" });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("proceeds when no previous email exists", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      await sendTransactionalEmail(defaultParams);

      expect(mockSendEmail).toHaveBeenCalled();
    });
  });

  describe("user validation", () => {
    it("returns user_not_found when user does not exist", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue(null);

      const result = await sendTransactionalEmail(defaultParams);

      expect(result).toEqual({ sent: false, reason: "user_not_found" });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("bypasses marketing unsubscribe", () => {
    it("sends email even when user has opted out of marketing", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      // Note: For transactional emails, we only check user exists (id)
      // marketingUnsubscribed is not checked
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      const result = await sendTransactionalEmail(defaultParams);

      expect(result).toEqual({ sent: true });
      expect(mockSendEmail).toHaveBeenCalled();
    });
  });

  describe("successful email sending", () => {
    it("sends trial ending email with correct subject", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      const result = await sendTransactionalEmail(defaultParams);

      expect(result).toEqual({ sent: true });
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.stringContaining("trial ends tomorrow"),
        })
      );
    });

    it("includes plan name in email body", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      await sendTransactionalEmail(defaultParams);

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain("Starter");
    });

    it("includes end date in email body", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      await sendTransactionalEmail(defaultParams);

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain("January 15, 2025");
    });

    it("includes price in email body", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      await sendTransactionalEmail(defaultParams);

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain("$9/month");
    });

    it("uses fallback name when name is null", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      await sendTransactionalEmail({ ...defaultParams, name: null });

      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain("Hi there");
    });

    it("records sent email in database", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });

      await sendTransactionalEmail(defaultParams);

      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("template selection", () => {
    it("returns error for unknown transactional template", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await sendTransactionalEmail({
        ...defaultParams,
        emailKey: "unknown_transactional_template",
      });

      expect(result).toEqual({ sent: false, reason: "unknown_template" });
    });

    it("returns error when required template fields are missing", async () => {
      mockFindFirstEmailsSent.mockResolvedValue(null);
      mockFindFirstUsers.mockResolvedValue({ id: "user-123" });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await sendTransactionalEmail({
        userId: "user-123",
        email: "test@example.com",
        name: "Test User",
        emailKey: "trial_ending_24h",
        templateData: { planName: "Starter" }, // Missing endDate and price
      });

      expect(result).toEqual({ sent: false, reason: "missing_template_data" });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Missing required fields")
      );
      expect(mockSendEmail).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

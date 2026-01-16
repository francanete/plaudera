import { vi, describe, it, expect } from "vitest";
import { z } from "zod";

// Test the validation schemas directly (same schemas used in the functions)
const userCreatedEventSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  email: z.string().email("Invalid email format"),
});

const paidSignupEventSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  email: z.string().email("Invalid email format"),
  name: z.string().nullable(),
});

describe("Inngest Event Validation Schemas", () => {
  describe("userCreatedEventSchema", () => {
    it("validates successfully with correct data", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "user-123",
        email: "test@example.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe("user-123");
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("fails when userId is missing", () => {
      const result = userCreatedEventSchema.safeParse({
        email: "test@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses "Required" or field-specific messages
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].path).toContain("userId");
      }
    });

    it("fails when userId is empty string", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "",
        email: "test@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain("userId is required");
      }
    });

    it("fails when email is missing", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "user-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses "Required" or field-specific messages
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].path).toContain("email");
      }
    });

    it("fails when email is invalid format", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "user-123",
        email: "not-an-email",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain("Invalid email format");
      }
    });

    it("fails when both fields are missing", () => {
      const result = userCreatedEventSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("paidSignupEventSchema", () => {
    it("validates successfully with all fields", () => {
      const result = paidSignupEventSchema.safeParse({
        userId: "user-123",
        email: "test@example.com",
        name: "John Doe",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("John Doe");
      }
    });

    it("validates successfully with null name", () => {
      const result = paidSignupEventSchema.safeParse({
        userId: "user-123",
        email: "test@example.com",
        name: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeNull();
      }
    });

    it("fails when name is undefined (not null)", () => {
      const result = paidSignupEventSchema.safeParse({
        userId: "user-123",
        email: "test@example.com",
        // name is missing (undefined)
      });

      expect(result.success).toBe(false);
    });

    it("fails when userId is missing", () => {
      const result = paidSignupEventSchema.safeParse({
        email: "test@example.com",
        name: null,
      });

      expect(result.success).toBe(false);
    });

    it("fails when email is invalid", () => {
      const result = paidSignupEventSchema.safeParse({
        userId: "user-123",
        email: "invalid",
        name: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain("Invalid email format");
      }
    });
  });

  describe("error message generation", () => {
    it("generates clear error message for validation failures", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "",
        email: "invalid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessage = result.error.issues
          .map((i) => i.message)
          .join(", ");
        expect(errorMessage).toContain("userId is required");
        expect(errorMessage).toContain("Invalid email format");
      }
    });

    it("provides structured error via flatten()", () => {
      const result = userCreatedEventSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        const flattened = result.error.flatten();
        expect(flattened.fieldErrors).toBeDefined();
        expect(flattened.fieldErrors.userId).toBeDefined();
        expect(flattened.fieldErrors.email).toBeDefined();
      }
    });
  });

  describe("edge cases", () => {
    it("handles special characters in email", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "user-123",
        email: "user+tag@example.com",
      });

      expect(result.success).toBe(true);
    });

    it("handles very long userId", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "a".repeat(1000),
        email: "test@example.com",
      });

      expect(result.success).toBe(true);
    });

    it("handles whitespace-only userId", () => {
      const result = userCreatedEventSchema.safeParse({
        userId: "   ",
        email: "test@example.com",
      });

      // Whitespace is technically valid (min 1 char) - could add trim if needed
      expect(result.success).toBe(true);
    });
  });
});

// Integration test to verify the validation pattern works
describe("Validation Pattern Integration", () => {
  it("demonstrates how validation would be used in Inngest function", async () => {
    // Simulate the validation logic from welcomeSequenceJob
    async function simulateWelcomeSequenceValidation(eventData: unknown) {
      const parseResult = userCreatedEventSchema.safeParse(eventData);
      if (!parseResult.success) {
        console.error(
          "[welcome-sequence] Invalid event data:",
          parseResult.error.flatten()
        );
        throw new Error(
          `Invalid event data: ${parseResult.error.issues.map((i) => i.message).join(", ")}`
        );
      }
      return parseResult.data;
    }

    // Test with valid data
    const validData = await simulateWelcomeSequenceValidation({
      userId: "user-123",
      email: "test@example.com",
    });
    expect(validData.userId).toBe("user-123");

    // Test with invalid data
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      simulateWelcomeSequenceValidation({ email: "test@example.com" })
    ).rejects.toThrow("Invalid event data:");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[welcome-sequence] Invalid event data:",
      expect.anything()
    );

    consoleSpy.mockRestore();
  });
});

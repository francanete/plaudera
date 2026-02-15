import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies before importing the module
const mockFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      contributorTokens: { findFirst: mockFindFirst },
      contributors: { findFirst: mockFindFirst },
    },
    insert: mockInsert,
    delete: mockDelete,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  contributors: { id: "id", email: "email" },
  contributorTokens: {
    token: "token",
    email: "email",
    workspaceId: "workspaceId",
  },
  contributorWorkspaceMemberships: {
    contributorId: "contributorId",
    workspaceId: "workspaceId",
  },
}));

const mockJwtVerify = vi.fn();

// SignJWT must be a proper class for `new SignJWT()` to work
class MockSignJWT {
  setProtectedHeader() {
    return this;
  }
  setExpirationTime() {
    return this;
  }
  setIssuedAt() {
    return this;
  }
  sign() {
    return Promise.resolve("mock-jwt-token");
  }
}

vi.mock("jose", () => ({
  SignJWT: MockSignJWT,
  jwtVerify: mockJwtVerify,
}));

const mockCookiesGet = vi.fn();
const mockCookiesSet = vi.fn();
const mockCookiesDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockCookiesGet,
    set: mockCookiesSet,
    delete: mockCookiesDelete,
  }),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "email-123" }),
}));

vi.mock("@/lib/config", () => ({
  appConfig: {
    name: "Test App",
  },
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn().mockReturnValue("mock-cuid"),
}));

describe("contributor-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CONTRIBUTOR_JWT_SECRET", "test-secret-key-32-chars-long!!");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://test.example.com");

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  describe("getContributor", () => {
    it("returns null when no cookie exists", async () => {
      mockCookiesGet.mockReturnValue(undefined);

      const { getContributor } = await import("@/lib/contributor-auth");
      const result = await getContributor();

      expect(result).toBeNull();
    });

    it("returns null for invalid JWT token", async () => {
      mockCookiesGet.mockReturnValue({ value: "invalid-token" });
      mockJwtVerify.mockRejectedValue(
        Object.assign(new Error("JWT malformed"), { name: "JWTInvalid" })
      );

      vi.resetModules();
      const { getContributor } = await import("@/lib/contributor-auth");
      const result = await getContributor();

      expect(result).toBeNull();
    });

    it("returns null for expired JWT token", async () => {
      mockCookiesGet.mockReturnValue({ value: "expired-token" });
      mockJwtVerify.mockRejectedValue(
        Object.assign(new Error("JWT expired"), { name: "JWTExpired" })
      );

      vi.resetModules();
      const { getContributor } = await import("@/lib/contributor-auth");
      const result = await getContributor();

      expect(result).toBeNull();
    });

    it("returns contributor for valid JWT", async () => {
      const mockContributor = {
        id: "contributor-123",
        email: "test@example.com",
        createdAt: new Date(),
      };

      mockCookiesGet.mockReturnValue({ value: "valid-token" });
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "contributor-123", email: "test@example.com" },
      });
      mockFindFirst.mockResolvedValue(mockContributor);

      vi.resetModules();
      const { getContributor } = await import("@/lib/contributor-auth");
      const result = await getContributor();

      expect(result).toEqual(mockContributor);
    });

    it("returns null when contributor not found in database", async () => {
      mockCookiesGet.mockReturnValue({ value: "valid-token" });
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "nonexistent-id", email: "test@example.com" },
      });
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { getContributor } = await import("@/lib/contributor-auth");
      const result = await getContributor();

      expect(result).toBeNull();
    });

    it("re-throws non-JWT errors", async () => {
      mockCookiesGet.mockReturnValue({ value: "some-token" });
      const dbError = new Error("Database connection failed");
      mockJwtVerify.mockRejectedValue(dbError);

      vi.resetModules();
      const { getContributor } = await import("@/lib/contributor-auth");

      await expect(getContributor()).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("verifyToken", () => {
    it("returns null for invalid token", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { verifyToken } = await import("@/lib/contributor-auth");
      const result = await verifyToken("invalid-token");

      expect(result).toBeNull();
    });

    it("returns null for expired token", async () => {
      // Token exists but is expired (findFirst returns null when date condition fails)
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { verifyToken } = await import("@/lib/contributor-auth");
      const result = await verifyToken("expired-token");

      expect(result).toBeNull();
    });

    it("creates contributor if not exists", async () => {
      const mockTokenRecord = {
        email: "new@example.com",
        workspaceId: "ws-1",
        token: "valid-token",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      const mockNewContributor = {
        id: "new-contributor-id",
        email: "new@example.com",
        createdAt: new Date(),
      };

      // First call: find token (contributorTokens)
      // Second call: find contributor (returns null)
      mockFindFirst
        .mockResolvedValueOnce(mockTokenRecord) // Token lookup
        .mockResolvedValueOnce(undefined); // Contributor lookup

      // Mock insert for creating new contributor
      const valuesMock = vi
        .fn()
        .mockReturnValueOnce({
          returning: vi.fn().mockResolvedValue([mockNewContributor]),
        })
        .mockReturnValueOnce({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        });

      mockInsert.mockReturnValue({ values: valuesMock });

      // Mock delete for removing used token
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.resetModules();
      const { verifyToken } = await import("@/lib/contributor-auth");
      const result = await verifyToken("valid-token");

      expect(result).not.toBeNull();
      expect(mockInsert).toHaveBeenCalled();
    });

    it("deletes token after successful verification", async () => {
      const mockTokenRecord = {
        email: "existing@example.com",
        workspaceId: "ws-1",
        token: "valid-token",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      const mockExistingContributor = {
        id: "existing-contributor-id",
        email: "existing@example.com",
        createdAt: new Date(),
      };

      mockFindFirst
        .mockResolvedValueOnce(mockTokenRecord)
        .mockResolvedValueOnce(mockExistingContributor);

      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.resetModules();
      const { verifyToken } = await import("@/lib/contributor-auth");
      await verifyToken("valid-token");

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("sendVerificationEmail", () => {
    it("stores token in database", async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.resetModules();
      const { sendVerificationEmail } = await import("@/lib/contributor-auth");
      const result = await sendVerificationEmail(
        "test@example.com",
        "/board",
        "ws-1"
      );

      expect(mockInsert).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("normalizes email to lowercase", async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.resetModules();
      const { sendVerificationEmail } = await import("@/lib/contributor-auth");
      await sendVerificationEmail("TEST@EXAMPLE.COM", "/board", "ws-1");

      expect(mockInsert).toHaveBeenCalled();
      // The first call to values() should contain lowercase email
      const valuesCall = mockInsert.mock.results[0].value.values;
      expect(valuesCall).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          workspaceId: "ws-1",
        })
      );
    });

    it("returns failure message when email sending fails", async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Mock sendEmail to throw
      vi.doMock("@/lib/email", () => ({
        sendEmail: vi.fn().mockRejectedValue(new Error("Email service down")),
      }));

      vi.resetModules();
      const { sendVerificationEmail } = await import("@/lib/contributor-auth");
      const result = await sendVerificationEmail(
        "test@example.com",
        "/board",
        "ws-1"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unable to send verification email");
    });
  });
});

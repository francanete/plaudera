import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies before importing the module
const mockFindFirst = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      workspaces: { findFirst: mockFindFirst },
    },
    insert: mockInsert,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  workspaces: {
    ownerId: "ownerId",
    slug: "slug",
    previousSlug: "previousSlug",
  },
  slugChangeHistory: { workspaceId: "workspaceId", changedAt: "changedAt" },
}));

vi.mock("@/lib/slug-validation", () => ({
  MAX_DAILY_SLUG_CHANGES: 3,
  MAX_LIFETIME_SLUG_CHANGES: 10,
}));

// Mock cuid2 with predictable output for testing
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn().mockReturnValue("abc12345xyz"),
}));

describe("workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSlug", () => {
    it("creates slug from email prefix with random suffix", async () => {
      const { generateSlug } = await import("@/lib/workspace");

      const slug = generateSlug("john.doe@example.com");

      expect(slug).toBe("johndoe-abc12345");
    });

    it("converts email prefix to lowercase", async () => {
      vi.resetModules();
      const { generateSlug } = await import("@/lib/workspace");

      const slug = generateSlug("JohnDoe@Example.COM");

      expect(slug.startsWith("johndoe-")).toBe(true);
    });

    it("removes special characters from email prefix", async () => {
      vi.resetModules();
      const { generateSlug } = await import("@/lib/workspace");

      const slug = generateSlug("john_doe+test@example.com");

      // Only alphanumeric chars kept: "johndoetest"
      expect(slug.startsWith("johndoetest-")).toBe(true);
    });

    it("truncates long email prefixes to 20 chars", async () => {
      vi.resetModules();
      const { generateSlug } = await import("@/lib/workspace");

      const slug = generateSlug(
        "verylongemailprefixthatshouldbetruncated@example.com"
      );

      // Prefix should be max 20 chars + "-" + 8 char suffix
      const prefix = slug.split("-")[0];
      expect(prefix.length).toBeLessThanOrEqual(20);
      expect(prefix).toBe("verylongemailprefixt");
    });

    it("handles email with only special chars in prefix", async () => {
      vi.resetModules();
      const { generateSlug } = await import("@/lib/workspace");

      const slug = generateSlug("___@example.com");

      // Prefix becomes empty, but suffix is still added
      expect(slug).toBe("-abc12345");
    });

    it("uses 8-char suffix from cuid", async () => {
      vi.resetModules();
      const { generateSlug } = await import("@/lib/workspace");

      const slug = generateSlug("test@example.com");

      const suffix = slug.split("-")[1];
      expect(suffix).toBe("abc12345");
      expect(suffix.length).toBe(8);
    });
  });

  describe("createUserWorkspace", () => {
    it("creates workspace with user name if provided", async () => {
      const mockWorkspace = {
        id: "workspace-123",
        name: "John's Workspace",
        slug: "john-abc12345",
        ownerId: "user-123",
        createdAt: new Date(),
      };

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockFindFirst.mockResolvedValue(mockWorkspace);

      vi.resetModules();
      const { createUserWorkspace } = await import("@/lib/workspace");

      const result = await createUserWorkspace(
        "user-123",
        "john@example.com",
        "John"
      );

      expect(result).toEqual(mockWorkspace);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("uses email prefix as name when name not provided", async () => {
      const mockWorkspace = {
        id: "workspace-456",
        name: "jane's Workspace",
        slug: "jane-abc12345",
        ownerId: "user-456",
        createdAt: new Date(),
      };

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockFindFirst.mockResolvedValue(mockWorkspace);

      vi.resetModules();
      const { createUserWorkspace } = await import("@/lib/workspace");

      const result = await createUserWorkspace(
        "user-456",
        "jane@example.com",
        null
      );

      expect(result).toEqual(mockWorkspace);

      // Verify values() was called with email prefix-based name
      const valuesCall = mockInsert.mock.results[0].value.values;
      expect(valuesCall).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "jane's Workspace",
        })
      );
    });

    it("handles race condition with onConflictDoNothing", async () => {
      const existingWorkspace = {
        id: "workspace-existing",
        name: "Existing Workspace",
        slug: "existing-slug",
        ownerId: "user-789",
        createdAt: new Date(),
      };

      // Insert completes without error (conflict ignored)
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // findFirst returns existing workspace (created by concurrent request)
      mockFindFirst.mockResolvedValue(existingWorkspace);

      vi.resetModules();
      const { createUserWorkspace } = await import("@/lib/workspace");

      const result = await createUserWorkspace(
        "user-789",
        "existing@example.com",
        "Existing"
      );

      // Should return the existing workspace, not fail
      expect(result).toEqual(existingWorkspace);
    });

    it("throws error when workspace not found after insert", async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Simulate workspace not found (unexpected state)
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { createUserWorkspace } = await import("@/lib/workspace");

      await expect(
        createUserWorkspace("user-error", "error@example.com", "Error")
      ).rejects.toThrow("Failed to create or retrieve workspace");
    });
  });

  describe("getUserWorkspace", () => {
    it("returns workspace when found", async () => {
      const mockWorkspace = {
        id: "workspace-123",
        name: "Test Workspace",
        slug: "test-abc12345",
        ownerId: "user-123",
        createdAt: new Date(),
      };

      mockFindFirst.mockResolvedValue(mockWorkspace);

      vi.resetModules();
      const { getUserWorkspace } = await import("@/lib/workspace");

      const result = await getUserWorkspace("user-123");

      expect(result).toEqual(mockWorkspace);
    });

    it("returns null when workspace not found", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { getUserWorkspace } = await import("@/lib/workspace");

      const result = await getUserWorkspace("nonexistent-user");

      expect(result).toBeNull();
    });
  });

  describe("getWorkspaceBySlug", () => {
    it("returns workspace with isRedirect false when current slug matches", async () => {
      const mockWorkspace = {
        id: "workspace-456",
        name: "Public Workspace",
        slug: "public-xyz98765",
        ownerId: "user-456",
        createdAt: new Date(),
      };

      mockFindFirst.mockResolvedValue(mockWorkspace);

      vi.resetModules();
      const { getWorkspaceBySlug } = await import("@/lib/workspace");

      const result = await getWorkspaceBySlug("public-xyz98765");

      expect(result).toEqual({ workspace: mockWorkspace, isRedirect: false });
    });

    it("returns workspace with isRedirect true when previousSlug matches", async () => {
      const mockWorkspace = {
        id: "workspace-456",
        name: "Public Workspace",
        slug: "new-slug",
        previousSlug: "old-slug",
        ownerId: "user-456",
        createdAt: new Date(),
      };

      // First call (current slug check) returns nothing
      // Second call (previousSlug check) returns the workspace
      mockFindFirst
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockWorkspace);

      vi.resetModules();
      const { getWorkspaceBySlug } = await import("@/lib/workspace");

      const result = await getWorkspaceBySlug("old-slug");

      expect(result).toEqual({ workspace: mockWorkspace, isRedirect: true });
    });

    it("returns null when slug not found", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { getWorkspaceBySlug } = await import("@/lib/workspace");

      const result = await getWorkspaceBySlug("nonexistent-slug");

      expect(result).toBeNull();
    });
  });
});

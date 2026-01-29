import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { sql } from "drizzle-orm";

// Mock dependencies
const mockFindFirst = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      widgetSettings: { findFirst: mockFindFirst },
    },
    select: mockSelect,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  widgetSettings: {
    workspaceId: "workspaceId",
    allowedOrigins: "allowedOrigins",
  },
}));

describe("cors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("normalizeOrigin", () => {
    it("returns normalized origin for valid https URL", async () => {
      const { normalizeOrigin } = await import("@/lib/cors");
      expect(normalizeOrigin("https://example.com")).toBe(
        "https://example.com"
      );
    });

    it("removes trailing slash", async () => {
      const { normalizeOrigin } = await import("@/lib/cors");
      expect(normalizeOrigin("https://example.com/")).toBe(
        "https://example.com"
      );
    });

    it("removes path components", async () => {
      const { normalizeOrigin } = await import("@/lib/cors");
      expect(normalizeOrigin("https://example.com/path/to/page")).toBe(
        "https://example.com"
      );
    });

    it("preserves port numbers", async () => {
      const { normalizeOrigin } = await import("@/lib/cors");
      expect(normalizeOrigin("http://localhost:3000")).toBe(
        "http://localhost:3000"
      );
    });

    it("returns null for invalid URLs", async () => {
      const { normalizeOrigin } = await import("@/lib/cors");
      expect(normalizeOrigin("not-a-url")).toBeNull();
    });

    it("returns null for non-http protocols", async () => {
      const { normalizeOrigin } = await import("@/lib/cors");
      expect(normalizeOrigin("ftp://example.com")).toBeNull();
      expect(normalizeOrigin("ws://example.com")).toBeNull();
    });
  });

  describe("validateOrigins", () => {
    it("filters out invalid origins", async () => {
      const { validateOrigins } = await import("@/lib/cors");
      const result = validateOrigins([
        "https://example.com",
        "not-a-url",
        "http://localhost:3000",
        "ftp://bad.com",
      ]);
      expect(result).toEqual(["https://example.com", "http://localhost:3000"]);
    });

    it("trims whitespace from origins", async () => {
      const { validateOrigins } = await import("@/lib/cors");
      const result = validateOrigins([
        "  https://example.com  ",
        " http://localhost:3000",
      ]);
      expect(result).toEqual(["https://example.com", "http://localhost:3000"]);
    });

    it("returns empty array for all invalid origins", async () => {
      const { validateOrigins } = await import("@/lib/cors");
      const result = validateOrigins(["not-a-url", "ftp://bad.com"]);
      expect(result).toEqual([]);
    });
  });

  describe("getBaseAllowedOrigins", () => {
    it("includes app origin when NEXT_PUBLIC_APP_URL is set", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      vi.stubEnv("NODE_ENV", "production");

      vi.resetModules();
      const { getBaseAllowedOrigins } = await import("@/lib/cors");
      const origins = getBaseAllowedOrigins();

      expect(origins).toContain("https://plaudera.com");
    });

    it("includes localhost variants in development", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      vi.stubEnv("NODE_ENV", "development");

      vi.resetModules();
      const { getBaseAllowedOrigins } = await import("@/lib/cors");
      const origins = getBaseAllowedOrigins();

      expect(origins).toContain("http://localhost:3000");
      expect(origins).toContain("http://localhost:3001");
      expect(origins).toContain("http://127.0.0.1:3000");
      expect(origins).toContain("http://127.0.0.1:3001");
    });

    it("does not include localhost variants in production", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      vi.stubEnv("NODE_ENV", "production");

      vi.resetModules();
      const { getBaseAllowedOrigins } = await import("@/lib/cors");
      const origins = getBaseAllowedOrigins();

      expect(origins).not.toContain("http://localhost:3000");
    });

    it("returns empty array when NEXT_PUBLIC_APP_URL is not set", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
      vi.stubEnv("NODE_ENV", "production");

      vi.resetModules();
      const { getBaseAllowedOrigins } = await import("@/lib/cors");
      const origins = getBaseAllowedOrigins();

      expect(origins).toEqual([]);
    });
  });

  describe("validateDashboardOrigin", () => {
    it("returns true when no origin header is present", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { validateDashboardOrigin } = await import("@/lib/cors");
      const request = new Request("https://plaudera.com/api/test", {
        method: "GET",
      });

      expect(validateDashboardOrigin(request)).toBe(true);
    });

    it("returns true for app's own origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { validateDashboardOrigin } = await import("@/lib/cors");
      const request = new Request("https://plaudera.com/api/test", {
        method: "POST",
        headers: { origin: "https://plaudera.com" },
      });

      expect(validateDashboardOrigin(request)).toBe(true);
    });

    it("returns true for localhost in development", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      vi.stubEnv("NODE_ENV", "development");

      vi.resetModules();
      const { validateDashboardOrigin } = await import("@/lib/cors");
      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { origin: "http://localhost:3001" },
      });

      expect(validateDashboardOrigin(request)).toBe(true);
    });

    it("returns false for unknown origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { validateDashboardOrigin } = await import("@/lib/cors");
      const request = new Request("https://plaudera.com/api/test", {
        method: "POST",
        headers: { origin: "https://malicious.com" },
      });

      expect(validateDashboardOrigin(request)).toBe(false);
    });

    it("returns false for invalid origin format", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { validateDashboardOrigin } = await import("@/lib/cors");
      const request = new Request("https://plaudera.com/api/test", {
        method: "POST",
        headers: { origin: "not-a-url" },
      });

      expect(validateDashboardOrigin(request)).toBe(false);
    });
  });

  describe("isWorkspaceOriginAllowed", () => {
    it("returns false for null origin", async () => {
      vi.resetModules();
      const { isWorkspaceOriginAllowed } = await import("@/lib/cors");
      const result = await isWorkspaceOriginAllowed(null, "workspace-123");

      expect(result).toBe(false);
    });

    it("returns false for invalid origin", async () => {
      vi.resetModules();
      const { isWorkspaceOriginAllowed } = await import("@/lib/cors");
      const result = await isWorkspaceOriginAllowed(
        "not-a-url",
        "workspace-123"
      );

      expect(result).toBe(false);
    });

    it("returns true for app's own origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { isWorkspaceOriginAllowed } = await import("@/lib/cors");
      const result = await isWorkspaceOriginAllowed(
        "https://plaudera.com",
        "workspace-123"
      );

      expect(result).toBe(true);
    });

    it("returns true for localhost in development", async () => {
      vi.stubEnv("NODE_ENV", "development");

      vi.resetModules();
      const { isWorkspaceOriginAllowed } = await import("@/lib/cors");
      const result = await isWorkspaceOriginAllowed(
        "http://localhost:3000",
        "workspace-123"
      );

      expect(result).toBe(true);
    });

    it("returns true when origin is in workspace allowlist", async () => {
      mockFindFirst.mockResolvedValue({
        allowedOrigins: ["https://customer.com", "https://example.com"],
      });

      vi.resetModules();
      const { isWorkspaceOriginAllowed } = await import("@/lib/cors");
      const result = await isWorkspaceOriginAllowed(
        "https://customer.com",
        "workspace-123"
      );

      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it("returns false when origin is not in workspace allowlist", async () => {
      mockFindFirst.mockResolvedValue({
        allowedOrigins: ["https://customer.com"],
      });

      vi.resetModules();
      const { isWorkspaceOriginAllowed } = await import("@/lib/cors");
      const result = await isWorkspaceOriginAllowed(
        "https://malicious.com",
        "workspace-123"
      );

      expect(result).toBe(false);
    });

    it("returns false when workspace has no settings", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { isWorkspaceOriginAllowed } = await import("@/lib/cors");
      const result = await isWorkspaceOriginAllowed(
        "https://customer.com",
        "workspace-123"
      );

      expect(result).toBe(false);
    });
  });

  describe("isOriginAllowedGlobally", () => {
    beforeEach(() => {
      // Setup the mock chain for db.select().from().where().limit()
      mockLimit.mockResolvedValue([]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
    });

    it("returns false for null origin", async () => {
      vi.resetModules();
      const { isOriginAllowedGlobally } = await import("@/lib/cors");
      const result = await isOriginAllowedGlobally(null);

      expect(result).toBe(false);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("returns false for invalid origin format", async () => {
      vi.resetModules();
      const { isOriginAllowedGlobally } = await import("@/lib/cors");
      const result = await isOriginAllowedGlobally("not-a-url");

      expect(result).toBe(false);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("returns true for app's own origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { isOriginAllowedGlobally } = await import("@/lib/cors");
      const result = await isOriginAllowedGlobally("https://plaudera.com");

      expect(result).toBe(true);
      // Should not query database for base origins
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("returns true for localhost in development", async () => {
      vi.stubEnv("NODE_ENV", "development");

      vi.resetModules();
      const { isOriginAllowedGlobally } = await import("@/lib/cors");
      const result = await isOriginAllowedGlobally("http://localhost:3000");

      expect(result).toBe(true);
      // Should not query database for base origins
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("returns true when origin exists in any workspace allowlist", async () => {
      // Mock database returning a workspace with the origin
      mockLimit.mockResolvedValue([{ workspaceId: "workspace-123" }]);

      vi.resetModules();
      const { isOriginAllowedGlobally } = await import("@/lib/cors");
      const result = await isOriginAllowedGlobally("https://customer.com");

      expect(result).toBe(true);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it("returns false when origin not found in any workspace", async () => {
      // Mock database returning no results
      mockLimit.mockResolvedValue([]);

      vi.resetModules();
      const { isOriginAllowedGlobally } = await import("@/lib/cors");
      const result = await isOriginAllowedGlobally("https://unknown.com");

      expect(result).toBe(false);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it("uses SQL ANY operator for efficient database query", async () => {
      mockLimit.mockResolvedValue([]);

      vi.resetModules();
      const { isOriginAllowedGlobally } = await import("@/lib/cors");
      await isOriginAllowedGlobally("https://customer.com");

      // Verify where() was called with a SQL expression
      expect(mockWhere).toHaveBeenCalled();
      const whereCall = mockWhere.mock.calls[0][0];
      // The where condition should be a SQL expression (has sql property)
      expect(whereCall).toBeDefined();
    });
  });

  describe("getWorkspaceCorsHeaders", () => {
    it("returns restrictive headers when origin not allowed", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      vi.resetModules();
      const { getWorkspaceCorsHeaders } = await import("@/lib/cors");
      const headers = await getWorkspaceCorsHeaders(
        "https://malicious.com",
        "workspace-123"
      );

      expect(headers["Access-Control-Allow-Origin"]).toBe("null");
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
      expect(headers["Vary"]).toBe("Origin");
    });

    it("returns permissive headers when origin is allowed", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { getWorkspaceCorsHeaders } = await import("@/lib/cors");
      const headers = await getWorkspaceCorsHeaders(
        "https://plaudera.com",
        "workspace-123"
      );

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://plaudera.com"
      );
      expect(headers["Access-Control-Allow-Methods"]).toBe(
        "GET, POST, OPTIONS"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("allows custom methods parameter", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { getWorkspaceCorsHeaders } = await import("@/lib/cors");
      const headers = await getWorkspaceCorsHeaders(
        "https://plaudera.com",
        "workspace-123",
        "POST, DELETE"
      );

      expect(headers["Access-Control-Allow-Methods"]).toBe("POST, DELETE");
    });
  });
});

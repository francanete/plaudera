import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock contributor auth
const mockClearContributorCookie = vi.fn();
vi.mock("@/lib/contributor-auth", () => ({
  clearContributorCookie: mockClearContributorCookie,
}));

// Mock CORS functions
const mockIsOriginAllowedGlobally = vi.fn();
vi.mock("@/lib/cors", () => ({
  isOriginAllowedGlobally: mockIsOriginAllowedGlobally,
}));

describe("/api/contributor/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearContributorCookie.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("OPTIONS - Preflight requests", () => {
    it("returns 204 with CORS headers for allowed origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { OPTIONS } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "OPTIONS",
          headers: { origin: "https://plaudera.com" },
        }
      );

      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://plaudera.com"
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "POST, OPTIONS"
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type"
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true"
      );
      expect(response.headers.get("Vary")).toBe("Origin");
    });

    it("returns 204 with restrictive CORS for disallowed origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { OPTIONS } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "OPTIONS",
          headers: { origin: "https://malicious.com" },
        }
      );

      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("null");
    });

    it("allows localhost in development mode", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { OPTIONS } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "http://localhost:3000/api/contributor/logout",
        {
          method: "OPTIONS",
          headers: { origin: "http://localhost:3001" },
        }
      );

      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3001"
      );
    });

    it("allows globally registered widget origins", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(true);

      vi.resetModules();
      const { OPTIONS } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "OPTIONS",
          headers: { origin: "https://customer-domain.com" },
        }
      );

      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://customer-domain.com"
      );
      expect(mockIsOriginAllowedGlobally).toHaveBeenCalledWith(
        "https://customer-domain.com"
      );
    });

    it("handles missing origin header", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { OPTIONS } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "OPTIONS",
        }
      );

      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("null");
    });
  });

  describe("POST - Logout", () => {
    it("clears contributor cookie and returns success", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "https://plaudera.com" },
        }
      );

      const response = await POST(request);

      expect(mockClearContributorCookie).toHaveBeenCalled();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({
        success: true,
        message: "Logged out successfully",
      });
    });

    it("sets CORS headers for allowed app origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "https://plaudera.com" },
        }
      );

      const response = await POST(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://plaudera.com"
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true"
      );
      expect(response.headers.get("Vary")).toBe("Origin");
    });

    it("sets CORS headers for globally allowed widget origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(true);

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "https://customer-domain.com" },
        }
      );

      const response = await POST(request);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://customer-domain.com"
      );
      expect(mockIsOriginAllowedGlobally).toHaveBeenCalledWith(
        "https://customer-domain.com"
      );
    });

    it("returns 403 and does not clear cookie when CORS check fails", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "https://malicious.com" },
        }
      );

      const response = await POST(request);

      expect(mockClearContributorCookie).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: "Origin not allowed",
      });
    });

    it("does not set CORS headers for disallowed origin", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "https://malicious.com" },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(403);
      // Should not include Access-Control-Allow-Origin for disallowed origin
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
      // But should include Vary header
      expect(response.headers.get("Vary")).toBe("Origin");
    });

    it("allows localhost in development mode", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "http://localhost:3000/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "http://localhost:3001" },
        }
      );

      const response = await POST(request);

      expect(mockClearContributorCookie).toHaveBeenCalled();
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3001"
      );
    });

    it("handles missing origin header", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "POST",
        }
      );

      const response = await POST(request);

      expect(mockClearContributorCookie).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("handles cookie clearing errors gracefully", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");
      mockClearContributorCookie.mockRejectedValue(
        new Error("Cookie clear failed")
      );

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "https://plaudera.com/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "https://plaudera.com" },
        }
      );

      // The error should propagate (not caught in the route handler)
      await expect(POST(request)).rejects.toThrow("Cookie clear failed");
    });
  });

  describe("isOriginAllowed (internal helper)", () => {
    it("denies origin when app URL not configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
      mockIsOriginAllowedGlobally.mockResolvedValue(false);

      vi.resetModules();
      const { POST } = await import("@/app/api/contributor/logout/route");

      const request = new NextRequest(
        "http://localhost:3000/api/contributor/logout",
        {
          method: "POST",
          headers: { origin: "https://example.com" },
        }
      );

      const response = await POST(request);

      // Should check global allowlist when app origin not configured
      expect(mockIsOriginAllowedGlobally).toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(mockClearContributorCookie).not.toHaveBeenCalled();
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });
});

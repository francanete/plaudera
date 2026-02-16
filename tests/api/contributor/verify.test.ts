import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockSendVerificationEmail = vi.fn();
const mockVerifyToken = vi.fn();

vi.mock("@/lib/contributor-auth", () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  verifyToken: mockVerifyToken,
}));

const mockCheckEmailRateLimit = vi.fn();
vi.mock("@/lib/contributor-rate-limit", () => ({
  checkEmailRateLimit: mockCheckEmailRateLimit,
}));

const mockGetWorkspaceCorsHeaders = vi.fn();
vi.mock("@/lib/cors", () => ({
  getWorkspaceCorsHeaders: mockGetWorkspaceCorsHeaders,
}));

const mockFindFirstWorkspace = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      workspaces: {
        findFirst: (...args: unknown[]) => mockFindFirstWorkspace(...args),
      },
    },
  },
}));

vi.mock("@/lib/db/schema", () => ({
  workspaces: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

describe("/api/contributor/verify POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

    mockCheckEmailRateLimit.mockResolvedValue({ allowed: true });
    mockFindFirstWorkspace.mockResolvedValue({ id: "ws_123" });
    mockGetWorkspaceCorsHeaders.mockResolvedValue({
      "Access-Control-Allow-Origin": "https://customer-site.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    });
    mockSendVerificationEmail.mockResolvedValue({
      success: true,
      message: "Check your email for a verification link",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends verification email with explicit workspaceId", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/contributor/verify/route");

    const request = new NextRequest(
      "https://plaudera.com/api/contributor/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://customer-site.com",
          "x-forwarded-for": "1.2.3.4",
        },
        body: JSON.stringify({
          email: "user@example.com",
          callbackUrl: "/embed/ws_123?action=vote",
          workspaceId: "ws_123",
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "user@example.com",
      "/embed/ws_123?action=vote",
      "ws_123"
    );
  });

  it("returns 400 when workspaceId is missing and callback is not embed path", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/contributor/verify/route");

    const request = new NextRequest(
      "https://plaudera.com/api/contributor/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://customer-site.com",
          "x-forwarded-for": "1.2.3.4",
        },
        body: JSON.stringify({
          email: "user@example.com",
          callbackUrl: "/board",
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it("uses workspaceId extracted from callback when explicit workspaceId is omitted", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/contributor/verify/route");

    const request = new NextRequest(
      "https://plaudera.com/api/contributor/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://customer-site.com",
          "x-forwarded-for": "1.2.3.4",
        },
        body: JSON.stringify({
          email: "user@example.com",
          callbackUrl: "/embed/ws_from_callback?action=vote",
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "user@example.com",
      "/embed/ws_from_callback?action=vote",
      "ws_from_callback"
    );
  });

  it("returns 400 when workspaceId does not exist in the database", async () => {
    mockFindFirstWorkspace.mockResolvedValue(undefined);
    vi.resetModules();
    const { POST } = await import("@/app/api/contributor/verify/route");

    const request = new NextRequest(
      "https://plaudera.com/api/contributor/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://plaudera.com",
          "x-forwarded-for": "1.2.3.4",
        },
        body: JSON.stringify({
          email: "user@example.com",
          callbackUrl: "/embed/nonexistent_ws",
          workspaceId: "nonexistent_ws",
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid workspace");
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });
});

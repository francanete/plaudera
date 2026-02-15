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
const mockIsWorkspaceOriginAllowed = vi.fn();
vi.mock("@/lib/cors", () => ({
  getWorkspaceCorsHeaders: mockGetWorkspaceCorsHeaders,
  isWorkspaceOriginAllowed: mockIsWorkspaceOriginAllowed,
}));

describe("/api/contributor/verify POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://plaudera.com");

    mockCheckEmailRateLimit.mockResolvedValue({ allowed: true });
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

  it("returns 403 and does not send email when origin is not allowed", async () => {
    mockIsWorkspaceOriginAllowed.mockResolvedValue(false);

    vi.resetModules();
    const { POST } = await import("@/app/api/contributor/verify/route");

    const request = new NextRequest(
      "https://plaudera.com/api/contributor/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://evil.com",
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

    expect(response.status).toBe(403);
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    expect(mockIsWorkspaceOriginAllowed).toHaveBeenCalledWith(
      "https://evil.com",
      "ws_123"
    );

    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: "Origin not allowed for this workspace",
    });
  });

  it("sends verification email when origin is allowed", async () => {
    mockIsWorkspaceOriginAllowed.mockResolvedValue(true);

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
    mockIsWorkspaceOriginAllowed.mockResolvedValue(true);

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
    expect(mockIsWorkspaceOriginAllowed).not.toHaveBeenCalled();
  });

  it("uses workspaceId extracted from callback when explicit workspaceId is omitted", async () => {
    mockIsWorkspaceOriginAllowed.mockResolvedValue(true);

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
    expect(mockIsWorkspaceOriginAllowed).toHaveBeenCalledWith(
      "https://customer-site.com",
      "ws_from_callback"
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "user@example.com",
      "/embed/ws_from_callback?action=vote",
      "ws_from_callback"
    );
  });
});

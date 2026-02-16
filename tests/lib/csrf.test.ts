import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockIsWorkspaceOriginAllowed } = vi.hoisted(() => ({
  mockIsWorkspaceOriginAllowed: vi.fn(),
}));

vi.mock("@/lib/cors", () => ({
  isWorkspaceOriginAllowed: mockIsWorkspaceOriginAllowed,
}));

import { NextRequest } from "next/server";
import { validateRequestOrigin } from "@/lib/csrf";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest("https://example.com/api/test", {
    method: "POST",
    headers,
  });
  return req;
}

describe("validateRequestOrigin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid when Origin header is allowed", async () => {
    mockIsWorkspaceOriginAllowed.mockResolvedValue(true);

    const result = await validateRequestOrigin(
      makeRequest({ origin: "https://mysite.com" }),
      "ws-1"
    );

    expect(result).toEqual({ valid: true, origin: "https://mysite.com" });
    expect(mockIsWorkspaceOriginAllowed).toHaveBeenCalledWith(
      "https://mysite.com",
      "ws-1"
    );
  });

  it("returns invalid when Origin is not in allowlist", async () => {
    mockIsWorkspaceOriginAllowed.mockResolvedValue(false);

    const result = await validateRequestOrigin(
      makeRequest({ origin: "https://evil.com" }),
      "ws-1"
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Origin not in workspace allowlist");
    expect(result.origin).toBe("https://evil.com");
  });

  it("falls back to Referer when Origin is missing", async () => {
    mockIsWorkspaceOriginAllowed.mockResolvedValue(true);

    const result = await validateRequestOrigin(
      makeRequest({ referer: "https://mysite.com/page?q=1" }),
      "ws-1"
    );

    expect(result.valid).toBe(true);
    // Should extract origin from referer URL
    expect(mockIsWorkspaceOriginAllowed).toHaveBeenCalledWith(
      "https://mysite.com",
      "ws-1"
    );
  });

  it("returns invalid when Referer is malformed", async () => {
    const result = await validateRequestOrigin(
      makeRequest({ referer: "not-a-url" }),
      "ws-1"
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Missing Origin and Referer headers");
  });

  it("returns invalid when both Origin and Referer are missing", async () => {
    const result = await validateRequestOrigin(makeRequest(), "ws-1");

    expect(result.valid).toBe(false);
    expect(result.origin).toBeNull();
    expect(result.reason).toBe("Missing Origin and Referer headers");
  });

  it("prefers Origin over Referer when both present", async () => {
    mockIsWorkspaceOriginAllowed.mockResolvedValue(true);

    const result = await validateRequestOrigin(
      makeRequest({
        origin: "https://primary.com",
        referer: "https://secondary.com/path",
      }),
      "ws-1"
    );

    expect(result.valid).toBe(true);
    expect(mockIsWorkspaceOriginAllowed).toHaveBeenCalledWith(
      "https://primary.com",
      "ws-1"
    );
  });
});

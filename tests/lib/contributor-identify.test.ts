import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies using vi.hoisted to avoid TDZ issues
const mocks = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockIsWorkspaceConfiguredOriginAllowed: vi.fn(),
  mockGetWorkspaceCorsHeaders: vi.fn(),
  mockGetBaseAllowedOrigins: vi.fn(),
  mockSetContributorCookie: vi.fn(),
  mockEnsureContributorWorkspaceMembership: vi.fn(),
  mockCheckIdentifyRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: mocks.mockInsert,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  contributors: {
    email: "email",
    id: "id",
    name: "name",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  })),
}));

vi.mock("@/lib/contributor-auth", () => ({
  setContributorCookie: mocks.mockSetContributorCookie,
  ensureContributorWorkspaceMembership:
    mocks.mockEnsureContributorWorkspaceMembership,
}));

vi.mock("@/lib/cors", () => ({
  isWorkspaceConfiguredOriginAllowed:
    mocks.mockIsWorkspaceConfiguredOriginAllowed,
  getWorkspaceCorsHeaders: mocks.mockGetWorkspaceCorsHeaders,
  getBaseAllowedOrigins: mocks.mockGetBaseAllowedOrigins,
}));

vi.mock("@/lib/contributor-rate-limit", () => ({
  checkIdentifyRateLimit: mocks.mockCheckIdentifyRateLimit,
}));

vi.mock("@/lib/api-utils", () => ({
  handleApiError: vi.fn((error: Error) => {
    const response = new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: new Headers({ "Content-Type": "application/json" }),
    });
    return response;
  }),
}));

vi.mock("@/lib/errors", () => ({
  RateLimitError: class RateLimitError extends Error {
    resetAt: Date;
    remaining: number;
    constructor(message: string, resetAt: Date, remaining: number) {
      super(message);
      this.name = "RateLimitError";
      this.resetAt = resetAt;
      this.remaining = remaining;
    }
  },
}));

describe("POST /api/contributor/identify", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: rate limit allows
    mocks.mockCheckIdentifyRateLimit.mockReturnValue({ allowed: true });

    // Default CORS headers
    mocks.mockGetWorkspaceCorsHeaders.mockResolvedValue({
      "Access-Control-Allow-Origin": "https://example.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    });

    // Default: base allowed origins
    mocks.mockGetBaseAllowedOrigins.mockReturnValue([
      "https://app.plaudera.com",
    ]);

    // Default: origin allowed
    mocks.mockIsWorkspaceConfiguredOriginAllowed.mockResolvedValue(true);

    // Default: cookie set succeeds
    mocks.mockSetContributorCookie.mockResolvedValue(undefined);
    mocks.mockEnsureContributorWorkspaceMembership.mockResolvedValue(undefined);

    // Default: env
    process.env.NEXT_PUBLIC_APP_URL = "https://app.plaudera.com";
  });

  /** Helper: set up the insert().values().onConflictDoUpdate().returning() mock chain */
  function mockUpsertReturning(contributor: Record<string, unknown>) {
    mocks.mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([contributor]),
        }),
      }),
    });
  }

  async function callIdentify(
    body: Record<string, unknown>,
    origin: string = "https://example.com"
  ) {
    // Dynamic import to pick up fresh mocks
    const { POST } = await import("@/app/api/contributor/identify/route");

    const request = new Request(
      "https://app.plaudera.com/api/contributor/identify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          "x-forwarded-for": "1.2.3.4",
        },
        body: JSON.stringify(body),
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return POST(request as any);
  }

  it("creates a new contributor via upsert", async () => {
    const newContributor = { id: "c1", email: "test@example.com", name: null };
    mockUpsertReturning(newContributor);

    const response = await callIdentify({
      email: "test@example.com",
      workspaceId: "ws-1",
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.contributor).toEqual({
      id: "c1",
      email: "test@example.com",
      name: null,
    });
    expect(mocks.mockEnsureContributorWorkspaceMembership).toHaveBeenCalledWith(
      "c1",
      "ws-1"
    );
    expect(mocks.mockSetContributorCookie).toHaveBeenCalledWith(newContributor);
  });

  it("returns existing contributor via upsert on conflict", async () => {
    const existingContributor = {
      id: "c2",
      email: "existing@example.com",
      name: "Existing User",
    };
    mockUpsertReturning(existingContributor);

    const response = await callIdentify({
      email: "existing@example.com",
      workspaceId: "ws-1",
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.contributor).toEqual({
      id: "c2",
      email: "existing@example.com",
      name: "Existing User",
    });
    expect(mocks.mockInsert).toHaveBeenCalled();
  });

  it("upsert fills name via COALESCE when name is provided", async () => {
    const updatedContributor = {
      id: "c3",
      email: "noname@example.com",
      name: "New Name",
    };
    mockUpsertReturning(updatedContributor);

    const response = await callIdentify({
      email: "noname@example.com",
      name: "New Name",
      workspaceId: "ws-1",
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.contributor.name).toBe("New Name");
  });

  it("rejects requests from non-allowed origins", async () => {
    mocks.mockIsWorkspaceConfiguredOriginAllowed.mockResolvedValue(false);

    const response = await callIdentify(
      {
        email: "test@example.com",
        workspaceId: "ws-1",
      },
      "https://evil.com"
    );

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Origin not allowed for this workspace");
  });

  it("rejects requests when rate limited", async () => {
    mocks.mockCheckIdentifyRateLimit.mockReturnValue({
      allowed: false,
      resetAt: new Date(Date.now() + 60000),
    });

    const response = await callIdentify({
      email: "test@example.com",
      workspaceId: "ws-1",
    });

    // handleApiError handles RateLimitError
    expect(response.status).toBe(500); // handleApiError mock returns 500
  });

  it("rejects invalid email", async () => {
    const response = await callIdentify({
      email: "not-an-email",
      workspaceId: "ws-1",
    });

    // Zod validation error caught by handleApiError
    expect(response.status).toBe(500);
  });

  it("rejects missing workspaceId", async () => {
    const response = await callIdentify({
      email: "test@example.com",
    });

    expect(response.status).toBe(500);
  });

  describe("error CORS headers", () => {
    it("uses getWorkspaceCorsHeaders when workspaceId is available", async () => {
      // Force a Zod validation error (invalid email) but with a valid workspaceId
      const response = await callIdentify({
        email: "not-an-email",
        workspaceId: "ws-1",
      });

      expect(response.status).toBe(500);
      expect(mocks.mockGetWorkspaceCorsHeaders).toHaveBeenCalledWith(
        "https://example.com",
        "ws-1",
        "POST, OPTIONS"
      );
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://example.com"
      );
    });

    it("falls back to base origins when workspaceId is unavailable", async () => {
      const response = await callIdentify({
        email: "test@example.com",
        // no workspaceId
      });

      expect(response.status).toBe(500);
      expect(mocks.mockGetBaseAllowedOrigins).toHaveBeenCalled();
    });

    it("sets origin to null when request origin is not in base allowed origins", async () => {
      mocks.mockGetBaseAllowedOrigins.mockReturnValue([
        "https://app.plaudera.com",
      ]);

      const response = await callIdentify(
        {
          email: "test@example.com",
          // no workspaceId — triggers fallback to base origins
        },
        "https://unknown-site.com"
      );

      expect(response.status).toBe(500);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("null");
    });
  });

  describe("callerOrigin validation", () => {
    it("accepts and validates callerOrigin when provided", async () => {
      const newContributor = {
        id: "c1",
        email: "test@example.com",
        name: null,
      };
      mockUpsertReturning(newContributor);

      const response = await callIdentify({
        email: "test@example.com",
        workspaceId: "ws-1",
        callerOrigin: "https://customer-site.com",
      });

      expect(response.status).toBe(200);
      // Origin check called twice: HTTP Origin and callerOrigin
      expect(mocks.mockIsWorkspaceConfiguredOriginAllowed).toHaveBeenCalledWith(
        "https://customer-site.com",
        "ws-1"
      );
    });

    it("rejects callerOrigin not in workspace allowlist", async () => {
      // Allow the HTTP Origin but reject the callerOrigin
      mocks.mockIsWorkspaceConfiguredOriginAllowed
        .mockResolvedValueOnce(true) // HTTP Origin check passes
        .mockResolvedValueOnce(false); // callerOrigin check fails

      const response = await callIdentify({
        email: "test@example.com",
        workspaceId: "ws-1",
        callerOrigin: "https://evil-site.com",
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Caller origin not allowed for this workspace");
    });

    it("works without callerOrigin (backward compatibility)", async () => {
      const newContributor = {
        id: "c1",
        email: "test@example.com",
        name: null,
      };
      mockUpsertReturning(newContributor);

      const response = await callIdentify({
        email: "test@example.com",
        workspaceId: "ws-1",
        // no callerOrigin
      });

      expect(response.status).toBe(200);
      // Origin check called only once (HTTP Origin)
      expect(
        mocks.mockIsWorkspaceConfiguredOriginAllowed
      ).toHaveBeenCalledTimes(1);
    });
  });
});

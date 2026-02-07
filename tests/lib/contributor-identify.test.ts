import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies using vi.hoisted to avoid TDZ issues
const mocks = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockIsWorkspaceOriginAllowed: vi.fn(),
  mockGetWorkspaceCorsHeaders: vi.fn(),
  mockSetContributorCookie: vi.fn(),
  mockCheckIdentifyRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      contributors: {
        findFirst: mocks.mockFindFirst,
      },
    },
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
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
}));

vi.mock("@/lib/contributor-auth", () => ({
  setContributorCookie: mocks.mockSetContributorCookie,
}));

vi.mock("@/lib/cors", () => ({
  isWorkspaceOriginAllowed: mocks.mockIsWorkspaceOriginAllowed,
  getWorkspaceCorsHeaders: mocks.mockGetWorkspaceCorsHeaders,
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

    // Default: origin allowed
    mocks.mockIsWorkspaceOriginAllowed.mockResolvedValue(true);

    // Default: cookie set succeeds
    mocks.mockSetContributorCookie.mockResolvedValue(undefined);

    // Default: env
    process.env.NEXT_PUBLIC_APP_URL = "https://app.plaudera.com";
  });

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

  it("creates a new contributor when not found", async () => {
    const newContributor = { id: "c1", email: "test@example.com", name: null };

    mocks.mockFindFirst.mockResolvedValue(null);
    mocks.mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newContributor]),
      }),
    });

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
    expect(mocks.mockSetContributorCookie).toHaveBeenCalledWith(newContributor);
  });

  it("returns existing contributor when found", async () => {
    const existingContributor = {
      id: "c2",
      email: "existing@example.com",
      name: "Existing User",
    };

    mocks.mockFindFirst.mockResolvedValue(existingContributor);

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
    expect(mocks.mockInsert).not.toHaveBeenCalled();
  });

  it("updates name if contributor has none and name is provided", async () => {
    const existingContributor = {
      id: "c3",
      email: "noname@example.com",
      name: null,
    };
    const updatedContributor = {
      id: "c3",
      email: "noname@example.com",
      name: "New Name",
    };

    mocks.mockFindFirst.mockResolvedValue(existingContributor);
    mocks.mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedContributor]),
        }),
      }),
    });

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
    mocks.mockIsWorkspaceOriginAllowed.mockResolvedValue(false);

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
});

import { vi, describe, it, expect, beforeEach } from "vitest";

const {
  mockGetSession,
  mockGetSubscriptionStatus,
  mockCheckAIRateLimit,
  mockHandleApiError,
  mockHeaders,
  mockDbQuery,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetSubscriptionStatus: vi.fn(),
  mockCheckAIRateLimit: vi.fn(),
  mockHandleApiError: vi.fn(),
  mockHeaders: vi.fn(),
  mockDbQuery: {
    users: { findFirst: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("@/lib/subscription", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkAIRateLimit: mockCheckAIRateLimit,
}));
vi.mock("@/lib/api-utils", () => ({
  handleApiError: mockHandleApiError,
}));
vi.mock("@/lib/db", () => ({
  db: { query: mockDbQuery },
}));
vi.mock("@/lib/db/schema", () => ({
  users: { id: "id" },
}));

// Must import after mocks
import {
  AuthError,
  protectedApiRouteWrapper,
  requirePaidAccess,
  requireAdminAccess,
  getSubscriptionFromRequest,
} from "@/lib/dal";

// Helpers
function makeSubscription(overrides = {}) {
  return {
    hasAccess: true,
    status: "ACTIVE",
    billingType: "recurring",
    isLifetime: false,
    polarProductId: "prod-1",
    expiresAt: null,
    plan: "STARTER",
    ...overrides,
  };
}

function makeSession(overrides = {}) {
  return {
    user: {
      id: "user-1",
      email: "test@example.com",
      emailVerified: true,
      ...overrides,
    },
    session: { id: "sess-1" },
  };
}

describe("getSubscriptionFromRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses valid JSON from x-subscription-status header", async () => {
    const sub = makeSubscription();
    mockHeaders.mockResolvedValue(
      new Headers({ "x-subscription-status": JSON.stringify(sub) })
    );

    const result = await getSubscriptionFromRequest();
    expect(result).toEqual(sub);
  });

  it("returns null when header is missing", async () => {
    mockHeaders.mockResolvedValue(new Headers());

    const result = await getSubscriptionFromRequest();
    expect(result).toBeNull();
  });

  it("returns null when header is malformed JSON", async () => {
    mockHeaders.mockResolvedValue(
      new Headers({ "x-subscription-status": "not-json" })
    );

    const result = await getSubscriptionFromRequest();
    expect(result).toBeNull();
  });
});

describe("requirePaidAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AuthError when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requirePaidAccess()).rejects.toThrow(AuthError);
    await expect(requirePaidAccess()).rejects.toThrow("Unauthorized");
  });

  it("throws AuthError when subscription has no access", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(
      makeSubscription({ hasAccess: false })
    );

    await expect(requirePaidAccess()).rejects.toThrow(
      "Active subscription required"
    );
  });

  it("returns userId and plan when access is granted", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(makeSubscription());

    const result = await requirePaidAccess();
    expect(result).toEqual({ userId: "user-1", plan: "STARTER" });
  });
});

describe("protectedApiRouteWrapper", () => {
  const mockHandler = vi.fn();
  const mockRequest = new Request("https://example.com/api/test");

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandler.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    mockHandleApiError.mockReturnValue(
      new Response(JSON.stringify({ error: "Internal" }), { status: 500 })
    );
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const wrapped = protectedApiRouteWrapper(mockHandler);
    const response = await wrapped(mockRequest);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when FREE plan and requirePaid=true (default)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(
      makeSubscription({ plan: "FREE" })
    );

    const wrapped = protectedApiRouteWrapper(mockHandler);
    const response = await wrapped(mockRequest);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("UPGRADE_REQUIRED");
  });

  it("allows FREE plan when requirePaid=false", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(
      makeSubscription({ plan: "FREE" })
    );

    const wrapped = protectedApiRouteWrapper(mockHandler, {
      requirePaid: false,
    });
    await wrapped(mockRequest);

    expect(mockHandler).toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(makeSubscription());
    mockCheckAIRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60000),
      limit: 10,
    });

    const wrapped = protectedApiRouteWrapper(mockHandler, {
      rateLimit: true,
    });
    const response = await wrapped(mockRequest);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    const body = await response.json();
    expect(body.code).toBe("RATE_LIMIT");
  });

  it("calls handler with full context when all checks pass", async () => {
    const session = makeSession();
    const subscription = makeSubscription();
    mockGetSession.mockResolvedValue(session);
    mockGetSubscriptionStatus.mockResolvedValue(subscription);

    const wrapped = protectedApiRouteWrapper(mockHandler);
    await wrapped(mockRequest);

    expect(mockHandler).toHaveBeenCalledWith(
      mockRequest,
      expect.objectContaining({
        session,
        subscription,
        params: {},
      })
    );
  });

  it("resolves params from route context", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(makeSubscription());

    const wrapped = protectedApiRouteWrapper(mockHandler);
    await wrapped(mockRequest, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(mockHandler).toHaveBeenCalledWith(
      mockRequest,
      expect.objectContaining({ params: { id: "123" } })
    );
  });

  it("delegates handler errors to handleApiError", async () => {
    const handlerError = new Error("handler boom");
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(makeSubscription());
    mockHandler.mockRejectedValue(handlerError);

    const wrapped = protectedApiRouteWrapper(mockHandler);
    await wrapped(mockRequest);

    expect(mockHandleApiError).toHaveBeenCalledWith(handlerError);
  });

  it("skips rate limit check when rateLimit option is false", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetSubscriptionStatus.mockResolvedValue(makeSubscription());

    const wrapped = protectedApiRouteWrapper(mockHandler, {
      rateLimit: false,
    });
    await wrapped(mockRequest);

    expect(mockCheckAIRateLimit).not.toHaveBeenCalled();
  });
});

describe("requireAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requireAdminAccess()).rejects.toThrow("Unauthorized");
  });

  it("throws when email not verified", async () => {
    mockGetSession.mockResolvedValue(makeSession({ emailVerified: false }));

    await expect(requireAdminAccess()).rejects.toThrow("Email not verified");
  });

  it("throws when user is not admin", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbQuery.users.findFirst.mockResolvedValue({ role: "user" });

    await expect(requireAdminAccess()).rejects.toThrow("Admin access required");
  });

  it("throws when user not found in DB", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbQuery.users.findFirst.mockResolvedValue(null);

    await expect(requireAdminAccess()).rejects.toThrow("Admin access required");
  });

  it("returns userId and isAdmin when admin", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockDbQuery.users.findFirst.mockResolvedValue({ role: "admin" });

    const result = await requireAdminAccess();
    expect(result).toEqual({ userId: "user-1", isAdmin: true });
  });
});

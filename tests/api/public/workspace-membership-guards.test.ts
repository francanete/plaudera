import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  mockValidateRequestOrigin: vi.fn(),
  mockGetContributor: vi.fn(),
  mockHasContributorWorkspaceMembership: vi.fn(),
  mockCheckIdeaRateLimit: vi.fn(),
  mockCheckVoteRateLimit: vi.fn(),
  mockGetWorkspaceCorsHeaders: vi.fn(),
  mockApplyWorkspaceCorsHeaders: vi.fn(),
  mockIdeasFindFirst: vi.fn(),
  mockWorkspacesFindFirst: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  validateRequestOrigin: mocks.mockValidateRequestOrigin,
}));

vi.mock("@/lib/contributor-auth", () => ({
  getContributor: mocks.mockGetContributor,
  hasContributorWorkspaceMembership: mocks.mockHasContributorWorkspaceMembership,
}));

vi.mock("@/lib/contributor-rate-limit", () => ({
  checkIdeaRateLimit: mocks.mockCheckIdeaRateLimit,
  checkVoteRateLimit: mocks.mockCheckVoteRateLimit,
}));

vi.mock("@/lib/cors", () => ({
  getWorkspaceCorsHeaders: mocks.mockGetWorkspaceCorsHeaders,
  applyWorkspaceCorsHeaders: mocks.mockApplyWorkspaceCorsHeaders,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      ideas: { findFirst: mocks.mockIdeasFindFirst },
      workspaces: { findFirst: mocks.mockWorkspacesFindFirst },
    },
    insert: mocks.mockInsert,
  },
}));

describe("workspace membership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockValidateRequestOrigin.mockResolvedValue({ valid: true });
    mocks.mockGetContributor.mockResolvedValue({
      id: "contributor_1",
      email: "user@example.com",
    });
    mocks.mockHasContributorWorkspaceMembership.mockResolvedValue(false);
    mocks.mockCheckIdeaRateLimit.mockResolvedValue({ allowed: true });
    mocks.mockCheckVoteRateLimit.mockResolvedValue({ allowed: true });
    mocks.mockGetWorkspaceCorsHeaders.mockResolvedValue({
      "Access-Control-Allow-Origin": "https://customer.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    });
    mocks.mockApplyWorkspaceCorsHeaders.mockResolvedValue(undefined);
  });

  it("blocks idea submission when contributor lacks workspace membership", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/public/[workspaceId]/ideas/route");

    const request = new NextRequest("https://plaudera.com/api/public/ws_1/ideas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://customer.com",
      },
      body: JSON.stringify({ title: "New idea", description: "desc" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ workspaceId: "ws_1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.mockCheckIdeaRateLimit).not.toHaveBeenCalled();
    expect(mocks.mockWorkspacesFindFirst).not.toHaveBeenCalled();
    expect(mocks.mockInsert).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.error).toBe("Please verify your email for this workspace");
  });

  it("blocks vote toggle when contributor lacks workspace membership", async () => {
    mocks.mockIdeasFindFirst.mockResolvedValue({
      id: "idea_1",
      workspaceId: "ws_1",
      voteCount: 0,
    });

    vi.resetModules();
    const { POST } = await import("@/app/api/public/ideas/[id]/vote/route");

    const request = new NextRequest(
      "https://plaudera.com/api/public/ideas/idea_1/vote",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://customer.com",
        },
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "idea_1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.mockCheckVoteRateLimit).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.error).toBe("Please verify your email for this workspace");
  });
});

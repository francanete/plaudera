import { handleApiError, toDashboardIdea } from "@/lib/api-utils";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
} from "@/lib/errors";
import { ZodError, z } from "zod";
import { vi } from "vitest";

describe("handleApiError", () => {
  // Suppress console.error for these tests since handleApiError logs errors
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("handles ZodError with field errors", async () => {
    const schema = z.object({ email: z.string().email() });
    let zodError: ZodError | null = null;
    try {
      schema.parse({ email: "invalid" });
    } catch (e) {
      zodError = e as ZodError;
    }

    const response = handleApiError(zodError);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.errors).toBeDefined();
  });

  it("handles RateLimitError with Retry-After header", async () => {
    const resetAt = new Date(Date.now() + 60000);
    const error = new RateLimitError("Limit exceeded", resetAt, 0);

    const response = handleApiError(error);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();

    const body = await response.json();
    expect(body.code).toBe("RATE_LIMIT");
  });

  it("handles BadRequestError", async () => {
    const response = handleApiError(new BadRequestError("Bad input"));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Bad input");
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("handles UnauthorizedError", async () => {
    const response = handleApiError(new UnauthorizedError());
    expect(response.status).toBe(401);
  });

  it("handles ForbiddenError", async () => {
    const response = handleApiError(new ForbiddenError());
    expect(response.status).toBe(403);
  });

  it("handles NotFoundError", async () => {
    const response = handleApiError(new NotFoundError());
    expect(response.status).toBe(404);
  });

  it("handles unknown errors as 500", async () => {
    const response = handleApiError(new Error("Something broke"));
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});

describe("toDashboardIdea", () => {
  const fullIdea = {
    id: "idea_1",
    workspaceId: "ws_1",
    contributorId: "contrib_1",
    title: "Add dark mode",
    description: "Users want dark mode",
    status: "PUBLISHED" as const,
    roadmapStatus: "PLANNED" as const,
    voteCount: 5,
    internalNote: "Prioritize for Q2",
    publicUpdate: "Coming soon!",
    showPublicUpdateOnRoadmap: true,
    problemStatement: "Users strain their eyes at night",
    frequencyTag: "daily" as const,
    workflowImpact: "minor" as const,
    workflowStage: "daily_workflow" as const,
    featureDetails: "Toggle in settings",
    mergedIntoId: null,
    authorEmail: "user@example.com",
    authorName: "Jane",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-15"),
  };

  it("includes all whitelisted fields", () => {
    const result = toDashboardIdea(fullIdea);

    expect(result).toEqual({
      id: "idea_1",
      workspaceId: "ws_1",
      contributorId: "contrib_1",
      title: "Add dark mode",
      description: "Users want dark mode",
      status: "PUBLISHED",
      roadmapStatus: "PLANNED",
      voteCount: 5,
      internalNote: "Prioritize for Q2",
      publicUpdate: "Coming soon!",
      showPublicUpdateOnRoadmap: true,
      problemStatement: "Users strain their eyes at night",
      frequencyTag: "daily",
      workflowImpact: "minor",
      workflowStage: "daily_workflow",
      featureDetails: "Toggle in settings",
      mergedIntoId: null,
      authorEmail: "user@example.com",
      authorName: "Jane",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-15"),
    });
  });

  it("strips extra fields like workspace relation", () => {
    const ideaWithRelation = {
      ...fullIdea,
      workspace: { id: "ws_1", ownerId: "user_123", slug: "my-board" },
    };

    const result = toDashboardIdea(ideaWithRelation as never);
    expect(result).not.toHaveProperty("workspace");
  });

  it("includes internalNote (needed for dashboard editing)", () => {
    const result = toDashboardIdea(fullIdea);
    expect(result.internalNote).toBe("Prioritize for Q2");
  });

  it("preserves null values", () => {
    const ideaWithNulls = {
      ...fullIdea,
      description: null,
      internalNote: null,
      publicUpdate: null,
      featureDetails: null,
      contributorId: null,
      authorEmail: null,
      authorName: null,
    };

    const result = toDashboardIdea(ideaWithNulls);
    expect(result.description).toBeNull();
    expect(result.internalNote).toBeNull();
    expect(result.publicUpdate).toBeNull();
    expect(result.featureDetails).toBeNull();
  });
});

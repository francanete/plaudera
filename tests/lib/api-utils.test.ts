import { handleApiError } from "@/lib/api-utils";
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

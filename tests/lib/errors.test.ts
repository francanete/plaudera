import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from "@/lib/errors";

describe("Error classes", () => {
  describe("AppError", () => {
    it("sets message, code, and statusCode", () => {
      const error = new AppError("Test error", "TEST_CODE", 500);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
    });

    it("defaults statusCode to 400", () => {
      const error = new AppError("Test", "CODE");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("BadRequestError", () => {
    it("has correct defaults", () => {
      const error = new BadRequestError();
      expect(error.message).toBe("Bad request");
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.statusCode).toBe(400);
    });

    it("accepts custom message", () => {
      const error = new BadRequestError("Invalid input");
      expect(error.message).toBe("Invalid input");
    });
  });

  describe("UnauthorizedError", () => {
    it("has correct defaults", () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe("Unauthorized");
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("ForbiddenError", () => {
    it("has correct defaults", () => {
      const error = new ForbiddenError();
      expect(error.message).toBe("Forbidden");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("NotFoundError", () => {
    it("has correct defaults", () => {
      const error = new NotFoundError();
      expect(error.message).toBe("Not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("ValidationError", () => {
    it("has correct defaults", () => {
      const error = new ValidationError("Validation failed");
      expect(error.message).toBe("Validation failed");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
    });

    it("accepts field errors", () => {
      const errors = { email: ["Invalid email"] };
      const error = new ValidationError("Validation failed", errors);
      expect(error.errors).toEqual(errors);
    });
  });

  describe("RateLimitError", () => {
    it("has correct defaults", () => {
      const error = new RateLimitError();
      expect(error.message).toBe("Too many requests");
      expect(error.code).toBe("RATE_LIMIT");
      expect(error.statusCode).toBe(429);
    });

    it("accepts resetAt and remaining", () => {
      const resetAt = new Date();
      const error = new RateLimitError("Limit exceeded", resetAt, 0);
      expect(error.resetAt).toBe(resetAt);
      expect(error.remaining).toBe(0);
    });
  });
});

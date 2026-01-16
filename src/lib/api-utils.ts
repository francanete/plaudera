import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, RateLimitError, ValidationError } from "./errors";

function fromZodError(error: ZodError): ValidationError {
  const errors: Record<string, string[]> = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join(".") || "value";
    if (!errors[path]) errors[path] = [];
    errors[path].push(issue.message);
  });
  return new ValidationError("Validation failed", errors);
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    return NextResponse.json(
      {
        error: validationError.message,
        code: validationError.code,
        errors: validationError.errors,
      },
      { status: 400 }
    );
  }

  // Handle rate limit errors with Retry-After header
  if (error instanceof RateLimitError) {
    const headers: HeadersInit = {};
    if (error.resetAt) {
      headers["Retry-After"] = String(
        Math.ceil((error.resetAt.getTime() - Date.now()) / 1000)
      );
    }
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        resetAt: error.resetAt,
        remaining: error.remaining,
      },
      { status: error.statusCode, headers }
    );
  }

  // Handle all AppError subclasses
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Fallback for unknown errors
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

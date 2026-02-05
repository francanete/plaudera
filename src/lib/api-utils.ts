import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, RateLimitError, ValidationError } from "./errors";
import type { ideas } from "./db/schema";

type Idea = typeof ideas.$inferSelect;

/**
 * Whitelist mapper for dashboard API responses.
 * Only returns fields the dashboard UI needs — prevents leaking
 * relations (workspace) or future schema additions.
 *
 * Unlike the public API mapper, this INCLUDES internalNote
 * since the dashboard owner needs it for editing.
 */
export function toDashboardIdea(idea: Idea) {
  return {
    id: idea.id,
    workspaceId: idea.workspaceId,
    contributorId: idea.contributorId,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    roadmapStatus: idea.roadmapStatus,
    voteCount: idea.voteCount,
    internalNote: idea.internalNote,
    publicUpdate: idea.publicUpdate,
    showPublicUpdateOnRoadmap: idea.showPublicUpdateOnRoadmap,
    featureDetails: idea.featureDetails,
    mergedIntoId: idea.mergedIntoId,
    authorEmail: idea.authorEmail,
    authorName: idea.authorName,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
  };
}

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

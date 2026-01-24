/**
 * CSRF Protection for Widget APIs
 *
 * Uses Origin/Referer validation to protect state-changing endpoints
 * from cross-site request forgery attacks. This approach works with
 * cross-origin embeds where traditional CSRF tokens aren't practical.
 *
 * Security model:
 * - POST requests must have an Origin or Referer header
 * - The origin must be in the workspace's allowed origins list
 * - This leverages the existing CORS allowlist infrastructure
 */

import { NextRequest } from "next/server";
import { isWorkspaceOriginAllowed } from "./cors";

export interface CsrfValidationResult {
  valid: boolean;
  origin: string | null;
  reason?: string;
}

/**
 * Validate that a request's origin is allowed for a workspace (by ID).
 * Uses Origin header with Referer fallback for browsers that don't send Origin.
 *
 * @param request - The incoming request
 * @param workspaceId - The workspace ID
 * @returns Validation result with origin and reason if invalid
 */
export async function validateRequestOrigin(
  request: NextRequest,
  workspaceId: string
): Promise<CsrfValidationResult> {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Try Origin first, fall back to Referer
  let effectiveOrigin = origin;
  if (!effectiveOrigin && referer) {
    try {
      effectiveOrigin = new URL(referer).origin;
    } catch {
      effectiveOrigin = null;
    }
  }

  // Require at least one of Origin or Referer
  if (!effectiveOrigin) {
    return {
      valid: false,
      origin: null,
      reason: "Missing Origin and Referer headers",
    };
  }

  // Check against workspace's allowed origins
  const isAllowed = await isWorkspaceOriginAllowed(
    effectiveOrigin,
    workspaceId
  );

  if (!isAllowed) {
    console.warn("[CSRF] Request from unauthorized origin:", {
      workspaceId,
      origin: effectiveOrigin,
    });
    return {
      valid: false,
      origin: effectiveOrigin,
      reason: "Origin not in workspace allowlist",
    };
  }

  return { valid: true, origin: effectiveOrigin };
}

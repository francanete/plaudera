/**
 * CORS utilities for widget embed endpoints
 *
 * Security: Uses an allowlist of trusted origins instead of wildcard (*).
 * This prevents malicious sites from exploiting contributor sessions.
 */

/**
 * Get the list of allowed origins for CORS requests.
 * In development, allows localhost. In production, requires explicit allowlist.
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Always allow the app's own origin
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
  }

  // Parse comma-separated allowlist from env
  const allowedOrigins = process.env.WIDGET_ALLOWED_ORIGINS;
  if (allowedOrigins) {
    const parsed = allowedOrigins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    origins.push(...parsed);
  }

  // In development, allow common localhost variants
  if (process.env.NODE_ENV === "development") {
    origins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001"
    );
  }

  return origins;
}

/**
 * Check if an origin is in the allowlist.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

/**
 * Build CORS headers for a request.
 * Returns the requesting origin if allowed, otherwise returns 'null' (blocks the request).
 */
export function getCorsHeaders(
  requestOrigin: string | null,
  methods: string = "GET, POST, OPTIONS"
): Record<string, string> {
  const allowed = isOriginAllowed(requestOrigin);

  return {
    // Return the specific origin if allowed, otherwise 'null' which blocks cross-origin access
    "Access-Control-Allow-Origin": allowed && requestOrigin ? requestOrigin : "null",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    // Vary header tells caches this response depends on the Origin header
    Vary: "Origin",
  };
}

/**
 * Apply CORS headers to a NextResponse.
 */
export function applyCorsHeaders(
  response: Response,
  requestOrigin: string | null,
  methods?: string
): void {
  const headers = getCorsHeaders(requestOrigin, methods);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

import crypto from "crypto";

const TOKEN_EXPIRY_DAYS = 30;

/**
 * Get the secret used for signing unsubscribe tokens.
 * Reuses BETTER_AUTH_SECRET to avoid requiring additional env vars.
 */
function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET must be set for unsubscribe token generation"
    );
  }
  return secret;
}

/**
 * Generate a signed unsubscribe token for an email.
 * Format: base64url(email|expiry|signature)
 *
 * The token is cryptographically signed and includes an expiration timestamp,
 * preventing attackers from unsubscribing users without a valid token.
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = getSecret();
  const expiry = Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${email}|${expiry}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

/**
 * Verify and extract email from unsubscribe token.
 * Returns the email if valid, or null if invalid/expired.
 *
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const secret = getSecret();

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split("|");

    if (parts.length !== 3) return null;

    const [email, expiryStr, providedSignature] = parts;
    const expiry = parseInt(expiryStr, 10);

    // Check expiry
    if (isNaN(expiry) || Date.now() > expiry) return null;

    // Verify signature using constant-time comparison
    const payload = `${email}|${expiryStr}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    // Constant-time comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) return null;

    if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    return email;
  } catch (error) {
    // Token parsing errors (malformed base64, etc.) are expected for invalid tokens
    if (error instanceof TypeError || error instanceof RangeError) {
      return null;
    }
    // Unexpected errors should propagate - don't silently mask system failures
    console.error("[Unsubscribe Token] Unexpected verification error:", error);
    throw error;
  }
}

/**
 * Generate full unsubscribe URL with signed token.
 * Use this in email templates instead of raw email addresses.
 */
export function generateUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?token=${token}`;
}

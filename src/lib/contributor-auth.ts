import { db } from "./db";
import {
  contributors,
  contributorTokens,
  contributorWorkspaceMemberships,
  type Contributor,
} from "./db/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sendEmail } from "./email";
import { appConfig } from "./config";
import { createId } from "@paralleldrive/cuid2";

const COOKIE_NAME = "plaudera_contributor";
const TOKEN_EXPIRY_MINUTES = 15;
const COOKIE_EXPIRY_DAYS = 30;

// Secret key for JWT signing (use CONTRIBUTOR_JWT_SECRET env var)
function getJwtSecret() {
  const secret = process.env.CONTRIBUTOR_JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("CONTRIBUTOR_JWT_SECRET or AUTH_SECRET must be set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a secure random token for email verification.
 */
function generateToken(): string {
  return createId() + createId(); // 48 chars, cryptographically random
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Send a verification email to a contributor.
 * Creates a token in the database and sends an email with the verification link.
 */
export async function sendVerificationEmail(
  email: string,
  callbackUrl: string,
  workspaceId: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = normalizeEmail(email);
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Store the token in the database
  await db.insert(contributorTokens).values({
    workspaceId,
    email: normalizedEmail,
    token,
    expiresAt,
  });

  // Build verification URL
  const verifyUrl = new URL(
    "/api/contributor/verify",
    process.env.NEXT_PUBLIC_APP_URL
  );
  verifyUrl.searchParams.set("token", token);
  verifyUrl.searchParams.set("callback", callbackUrl);

  // Send the email
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: `Verify your email for ${appConfig.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify your email</h2>
          <p>Click the button below to verify your email and continue:</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl.toString()}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
              Verify Email
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link expires in ${TOKEN_EXPIRY_MINUTES} minutes.
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("[ContributorAuth] Failed to send verification email:", {
      error: emailError instanceof Error ? emailError.message : "Unknown",
    });

    // Clean up orphaned token
    await db
      .delete(contributorTokens)
      .where(eq(contributorTokens.token, token));

    return {
      success: false,
      message: "Unable to send verification email. Please try again.",
    };
  }

  return { success: true, message: "Check your email for a verification link" };
}

/**
 * Verify a token from the email link.
 * Returns the contributor and sets the authentication cookie.
 */
export async function verifyToken(
  token: string
): Promise<{ contributor: Contributor; callbackUrl: string } | null> {
  // Find and validate the token
  const tokenRecord = await db.query.contributorTokens.findFirst({
    where: and(
      eq(contributorTokens.token, token),
      gt(contributorTokens.expiresAt, new Date())
    ),
  });

  if (!tokenRecord) {
    return null;
  }

  const normalizedEmail = normalizeEmail(tokenRecord.email);

  // Create or find the contributor
  let contributor = await db.query.contributors.findFirst({
    where: eq(contributors.email, normalizedEmail),
  });

  if (!contributor) {
    const [newContributor] = await db
      .insert(contributors)
      .values({ email: normalizedEmail })
      .returning();
    contributor = newContributor;
  }

  // Delete the used token
  await db.delete(contributorTokens).where(eq(contributorTokens.token, token));

  // Grant contributor access to this workspace
  await ensureContributorWorkspaceMembership(
    contributor.id,
    tokenRecord.workspaceId
  );

  // Set the authentication cookie
  await setContributorCookie(contributor);

  return { contributor, callbackUrl: "" };
}

/**
 * Create and set the contributor authentication cookie.
 */
export async function setContributorCookie(
  contributor: Contributor
): Promise<void> {
  const token = await new SignJWT({
    sub: contributor.id,
    email: contributor.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${COOKIE_EXPIRY_DAYS}d`)
    .setIssuedAt()
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions: Parameters<typeof cookieStore.set>[2] = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: COOKIE_EXPIRY_DAYS * 24 * 60 * 60,
    path: "/",
  };

  // Set domain to root domain so cookie works across subdomains
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_APP_URL
  ) {
    try {
      const rootDomain = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
      cookieOptions.domain = `.${rootDomain}`;
    } catch {
      // Fall through without domain if URL is invalid
    }
  }

  cookieStore.set(COOKIE_NAME, token, cookieOptions);
}

/**
 * Get the authenticated contributor from the request cookie.
 * Returns null if not authenticated or token is invalid.
 * Throws on database errors (these should not be silenced).
 */
export async function getContributor(): Promise<Contributor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  let contributorId: string;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    contributorId = payload.sub as string;
  } catch (error) {
    // Only catch JWT-specific verification errors (invalid/expired token)
    // These are expected errors and should return null
    if (
      error instanceof Error &&
      (error.name === "JWTExpired" ||
        error.name === "JWTInvalid" ||
        error.message.includes("JWS") ||
        error.message.includes("JWT"))
    ) {
      return null;
    }
    // Re-throw unexpected errors
    throw error;
  }

  if (!contributorId) {
    return null;
  }

  // DB errors should propagate - don't catch here
  const contributor = await db.query.contributors.findFirst({
    where: eq(contributors.id, contributorId),
  });

  return contributor || null;
}

export async function ensureContributorWorkspaceMembership(
  contributorId: string,
  workspaceId: string
): Promise<void> {
  await db
    .insert(contributorWorkspaceMemberships)
    .values({ contributorId, workspaceId })
    .onConflictDoNothing();
}

export async function hasContributorWorkspaceMembership(
  contributorId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await db.query.contributorWorkspaceMemberships.findFirst({
    where: and(
      eq(contributorWorkspaceMemberships.contributorId, contributorId),
      eq(contributorWorkspaceMemberships.workspaceId, workspaceId)
    ),
  });

  return !!membership;
}

/**
 * Clear the contributor authentication cookie.
 */
export async function clearContributorCookie(): Promise<void> {
  const cookieStore = await cookies();
  const deleteOptions: { path: string; domain?: string } = { path: "/" };

  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_APP_URL
  ) {
    try {
      const rootDomain = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
      deleteOptions.domain = `.${rootDomain}`;
    } catch {
      // Fall through without domain
    }
  }

  cookieStore.delete({ name: COOKIE_NAME, ...deleteOptions });
}

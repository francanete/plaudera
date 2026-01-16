import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail, verifyToken } from "@/lib/contributor-auth";
import { handleApiError } from "@/lib/api-utils";
import { BadRequestError } from "@/lib/errors";

const sendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  callbackUrl: z.string().min(1, "Callback URL is required"),
});

/**
 * POST /api/contributor/verify
 * Send a verification email to a contributor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, callbackUrl } = sendVerificationSchema.parse(body);

    const result = await sendVerificationEmail(email, callbackUrl);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/contributor/verify?token=xxx&callback=xxx
 * Verify a token and redirect back to the board
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const callback = searchParams.get("callback") || "/";

    if (!token) {
      throw new BadRequestError("Verification token is required");
    }

    const result = await verifyToken(token);

    if (!result) {
      // Token invalid or expired - redirect to callback with error
      const errorUrl = new URL(callback, process.env.NEXT_PUBLIC_APP_URL);
      errorUrl.searchParams.set("error", "invalid_token");
      return NextResponse.redirect(errorUrl.toString());
    }

    // Success - redirect to callback
    const successUrl = new URL(callback, process.env.NEXT_PUBLIC_APP_URL);
    successUrl.searchParams.set("verified", "true");
    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error("Verification error:", error);
    // Redirect to home with error on unexpected failure
    const errorUrl = new URL("/", process.env.NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}

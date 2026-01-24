import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { addEmailToSegment } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const result = await addEmailToSegment({
      email,
      segmentId: appConfig.resendSegments.waitlist,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to join waitlist. Please try again." },
        {
          status:
            result.error === "Service temporarily unavailable" ? 503 : 500,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Waitlist] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

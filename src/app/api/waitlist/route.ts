import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!audienceId) {
      if (process.env.NODE_ENV === "production") {
        console.error("[Waitlist] RESEND_AUDIENCE_ID is not configured");
        return NextResponse.json(
          { error: "Service temporarily unavailable" },
          { status: 503 }
        );
      }
      // Development: log and return success
      console.log("[Waitlist] Dev mode - would add contact:", { email });
      return NextResponse.json({ success: true });
    }

    if (!process.env.RESEND_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        console.error("[Waitlist] RESEND_API_KEY is not configured");
        return NextResponse.json(
          { error: "Service temporarily unavailable" },
          { status: 503 }
        );
      }
      console.log("[Waitlist] Dev mode - would add contact:", { email });
      return NextResponse.json({ success: true });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId,
    });

    if (error) {
      console.error("[Waitlist] Resend error:", error);
      // Resend returns a specific error for duplicate contacts
      if (error.message?.includes("already exists")) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
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

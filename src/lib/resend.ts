import type { Resend } from "resend";

let resendInstance: Resend | null = null;

async function getResendClient(): Promise<Resend> {
  if (!resendInstance) {
    const { Resend } = await import("resend");
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

interface AddEmailToSegmentOptions {
  email: string;
  segmentId: string;
}

/**
 * Adds an email to a Resend segment.
 * Creates the contact in the default audience if it doesn't already exist.
 */
export async function addEmailToSegment({
  email,
  segmentId,
}: AddEmailToSegmentOptions): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Resend] RESEND_API_KEY is not configured");
      return { success: false, error: "Service temporarily unavailable" };
    }
    console.log("[Resend] Dev mode - would add contact to segment:", {
      email,
      segmentId,
    });
    return { success: true };
  }

  const resend = await getResendClient();

  const { error } = await resend.contacts.segments.add({
    email,
    segmentId,
  });

  if (error) {
    console.error("[Resend] Segment add failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

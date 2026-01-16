"use client";

import { toast } from "sonner";
import { MESSAGES } from "./messages";

export function handleRateLimitError(response: { resetAt: string }) {
  const resetDate = new Date(response.resetAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  const hours = Math.max(1, Math.ceil(diffMs / 3600000));
  toast.error(MESSAGES.RATE_LIMIT_DAILY(hours));
}

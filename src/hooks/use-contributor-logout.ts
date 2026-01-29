"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseContributorLogoutOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Shared hook for contributor logout functionality.
 *
 * Features:
 * - Uses `credentials: "include"` for cross-origin cookie handling (required for embeds)
 * - State-only guard against concurrent logouts (no ref race conditions)
 * - Handles errors gracefully without re-throwing (prevents unhandled promise rejections)
 */
export function useContributorLogout(
  options: UseContributorLogoutOptions = {}
) {
  const { onSuccess, onError } = options;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    // State-only guard - prevents concurrent logout attempts
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const res = await fetch("/api/contributor/logout", {
        method: "POST",
        credentials: "include", // Required for cross-origin cookie handling
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }

      toast.success("Signed out successfully");
      onSuccess?.();
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to sign out. Please try again.");
      onError?.(error instanceof Error ? error : new Error("Unknown error"));
      // Note: We intentionally don't re-throw here.
      // The error is fully handled (logged + toast shown).
      // Re-throwing would cause unhandled promise rejections upstream.
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, onSuccess, onError]);

  return { logout, isLoggingOut };
}

"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MESSAGES } from "@/lib/messages";

export function CheckoutSuccessToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      // Invalidate client-side React Query cache
      queryClient.invalidateQueries({ queryKey: ["subscription"] });

      // Clear server-side rate limit cache
      fetch("/api/subscription/clear-cache", { method: "POST" }).catch(
        () => {}
      );

      toast.success(MESSAGES.CHECKOUT_SUCCESS, {
        description: "Your purchase was successful. Enjoy your new features!",
      });
      router.replace("/dashboard");
    }
  }, [searchParams, router, queryClient]);

  return null;
}

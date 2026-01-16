"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  syncSubscriptionAction,
  type SyncSubscriptionResult,
} from "@/actions/subscription";

type SyncState = "loading" | "done";

export function CheckoutSuccessContent() {
  const [state, setState] = useState<SyncState>("loading");
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);

  useEffect(() => {
    syncSubscriptionAction().then((result: SyncSubscriptionResult) => {
      setCanAccessDashboard(result.canAccessDashboard);
      setState("done");
    });
  }, []);

  if (state === "loading") {
    return (
      <div className="text-center">
        <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
        <p className="text-muted-foreground">Updating your access...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-6 flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      <h1 className="text-2xl font-bold">Payment Successful!</h1>
      <p className="text-muted-foreground mt-2">Thank you for your purchase.</p>

      {canAccessDashboard ? (
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-muted-foreground text-sm">
            Check your email for a link to access your account.
          </p>
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link href="/login" className="hover:text-foreground underline">
              Sign in here
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

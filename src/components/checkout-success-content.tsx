"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncSubscriptionAction } from "@/actions/subscription";

const MAX_AUTO_RETRIES = 5;
const RETRY_DELAYS_MS = [1500, 2500, 4000, 6000, 8000];

type SyncState = "loading" | "success" | "processing";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CheckoutSuccessContent({
  customerSessionToken,
}: {
  customerSessionToken?: string;
}) {
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);
  const hasStarted = useRef(false);

  const runSync = async (useToken: boolean, isRetry = false) => {
    if (isRetry) setSyncState("loading");

    if (useToken && customerSessionToken) {
      // With token: single attempt — Customer Portal API returns data instantly
      try {
        const result = await syncSubscriptionAction(customerSessionToken);
        if (result.canAccessDashboard) {
          setCanAccessDashboard(true);
          setSyncState("success");
          return;
        }
      } catch {
        // Token-based sync failed — fall through to processing state
      }
      setSyncState("processing");
      return;
    }

    // Without token: retry loop with backoff (admin API has eventual consistency)
    for (let attempt = 0; attempt < MAX_AUTO_RETRIES; attempt++) {
      try {
        const result = await syncSubscriptionAction();

        if (result.canAccessDashboard) {
          setCanAccessDashboard(true);
          setSyncState("success");
          return;
        }
      } catch {
        // Server action failed — will retry
      }

      if (attempt < MAX_AUTO_RETRIES - 1) {
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }

    // All auto-retries exhausted — let user retry manually
    setSyncState("processing");
  };

  useEffect(() => {
    // Guard against StrictMode double-invocation
    if (hasStarted.current) return;
    hasStarted.current = true;

    runSync(!!customerSessionToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (syncState === "loading") {
    return (
      <div className="text-center">
        <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
        <p className="text-muted-foreground">Confirming your payment...</p>
      </div>
    );
  }

  if (syncState === "processing") {
    return (
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Payment Received!</h1>
        <p className="text-muted-foreground mt-2">
          Your subscription is being activated. This usually takes a few
          seconds.
        </p>
        <div className="mt-8">
          <Button
            onClick={() => runSync(false, true)}
            variant="outline"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Again
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link href="/login" className="hover:text-foreground underline">
              Sign in here
            </Link>
          </p>
        </div>
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

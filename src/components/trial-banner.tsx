"use client";

import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { customer } from "@/lib/auth-client";

interface TrialBannerProps {
  endsAt: Date;
}

export function TrialBanner({ endsAt }: TrialBannerProps) {
  const daysRemaining = Math.max(0, dayjs(endsAt).diff(dayjs(), "day"));

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="container flex items-center justify-between">
        <p className="text-sm">
          <span className="font-medium">You&apos;re on a free trial</span>
          {" — "}
          {daysRemaining === 0
            ? "ends today, you'll be charged after."
            : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining. You'll be charged when it ends.`}
        </p>
        <Button size="sm" onClick={() => customer.portal()}>
          Manage Subscription
        </Button>
      </div>
    </div>
  );
}

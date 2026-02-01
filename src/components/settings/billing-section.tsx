"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { customer } from "@/lib/auth-client";
import type { Subscription } from "@/lib/db/schema";
import dayjs from "dayjs";
import { Clock } from "lucide-react";

interface BillingSectionProps {
  subscription: Subscription | undefined;
}

const statusColors = {
  ACTIVE: "default",
  TRIALING: "secondary",
  CANCELED: "destructive",
  PAST_DUE: "destructive",
} as const;

function formatPlanName(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

function getTrialDaysRemaining(endDate: Date): number {
  return dayjs(endDate).diff(dayjs(), "day");
}

export function BillingSection({ subscription }: BillingSectionProps) {
  const plan = subscription?.plan || "FREE";
  const status = subscription?.status || "ACTIVE";
  const isTrialing = status === "TRIALING";
  const isRecurring =
    subscription?.billingType === "recurring" &&
    !subscription?.cancelAtPeriodEnd;

  async function handleManageBilling() {
    await customer.portal();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>
          Manage your subscription and billing information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan display - single line with status badge */}
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            Current Plan
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold">{formatPlanName(plan)}</span>
            <Badge variant={statusColors[status]}>
              {isTrialing ? "Trial" : status === "ACTIVE" ? "Active" : status}
            </Badge>
          </div>
        </div>

        {/* Trial-specific information */}
        {isTrialing && subscription?.currentPeriodEnd && (
          <>
            <Separator />
            <div className="bg-muted/50 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Clock className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {getTrialDaysRemaining(subscription.currentPeriodEnd)} days
                    remaining in your trial
                  </p>
                  <p className="text-muted-foreground text-sm">
                    You&apos;ll be charged on{" "}
                    {dayjs(subscription.currentPeriodEnd).format(
                      "MMMM D, YYYY"
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Cancel anytime before your trial ends.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Active recurring subscription - next billing */}
        {!isTrialing && isRecurring && subscription?.currentPeriodEnd && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Next billing date
              </p>
              <p className="mt-1">
                {dayjs(subscription.currentPeriodEnd).format("MMMM D, YYYY")}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Cancel anytime from the billing portal.
              </p>
            </div>
          </>
        )}

        {/* Canceled subscription - access until */}
        {subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Access until
              </p>
              <p className="mt-1">
                {dayjs(subscription.currentPeriodEnd).format("MMMM D, YYYY")}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Your subscription will not renew.
              </p>
            </div>
          </>
        )}

        {/* Lifetime access */}
        {subscription?.billingType === "one_time" && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Billing Type
              </p>
              <p className="mt-1">Lifetime access</p>
            </div>
          </>
        )}

        <Separator />

        <div className="flex gap-3">
          <Button onClick={handleManageBilling}>Manage Billing</Button>
        </div>
      </CardContent>
    </Card>
  );
}

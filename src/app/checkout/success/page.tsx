import type { Metadata } from "next";
import { CheckoutSuccessContent } from "@/components/checkout-success-content";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: `Payment Successful | ${appConfig.name}`,
  description: "Thank you for your purchase",
};

export default function CheckoutSuccessPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="max-w-md px-4">
        <CheckoutSuccessContent />
      </div>
    </div>
  );
}

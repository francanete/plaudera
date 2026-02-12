import type { Metadata } from "next";
import { CheckoutSuccessContent } from "@/components/checkout-success-content";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: `Payment Successful | ${appConfig.name}`,
  description: "Thank you for your purchase",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const customerSessionToken =
    typeof params.customer_session_token === "string"
      ? params.customer_session_token
      : undefined;

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="max-w-md px-4">
        <CheckoutSuccessContent customerSessionToken={customerSessionToken} />
      </div>
    </div>
  );
}

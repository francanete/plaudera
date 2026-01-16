import type { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Manage your email preferences",
};

function getErrorContent(error: string | undefined): {
  title: string;
  message: string;
} {
  switch (error) {
    case "not-found":
      return {
        title: "Email Not Found",
        message: "We couldn't find an account with that email address.",
      };
    case "invalid-token":
      return {
        title: "Invalid or Expired Link",
        message:
          "This unsubscribe link is invalid or has expired. Please use the link from a recent email.",
      };
    default:
      return {
        title: "Something Went Wrong",
        message: "We couldn't process your request. Please try again later.",
      };
  }
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  if (success) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 text-4xl">&#x2713;</div>
          <h1 className="text-foreground text-2xl font-bold">Unsubscribed</h1>
          <p className="text-muted-foreground mt-2">
            You&apos;ve been unsubscribed from marketing emails. You&apos;ll
            still receive transactional emails like password resets and
            receipts.
          </p>
          <Link
            href="/"
            className="text-primary mt-6 inline-block text-sm hover:underline"
          >
            Return to {appConfig.name}
          </Link>
        </div>
      </div>
    );
  }

  const { title, message } = getErrorContent(error);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 text-4xl">&#x2717;</div>
        <h1 className="text-foreground text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">{message}</p>
        <Link
          href="/"
          className="text-primary mt-6 inline-block text-sm hover:underline"
        >
          Return to {appConfig.name}
        </Link>
      </div>
    </div>
  );
}

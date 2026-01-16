"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Blog error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <div className="container mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-24">
        <div className="mb-6 rounded-full bg-red-50 p-6 ring-1 ring-red-100">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Something went wrong
        </h1>

        <p className="mb-2 max-w-md text-center text-lg text-slate-600">
          We encountered an error while loading this blog content.
        </p>

        {error.digest && (
          <p className="mb-8 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={reset}
            size="lg"
            className="bg-slate-900 hover:bg-slate-800"
          >
            Try Again
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

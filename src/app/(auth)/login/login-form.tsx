"use client";

import { useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { PlauderaLogo } from "@/components/plaudera-logo";
import { GoogleLogo } from "@/components/auth/google-logo";
import { ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send magic link"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Logo Section */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <PlauderaLogo className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold text-slate-900">Plaudera</span>
        </div>

        {/* Success Card */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-xl md:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900">
              Check your email
            </h2>
            <p className="mb-6 text-slate-600">
              We sent a magic link to{" "}
              <span className="font-semibold text-slate-900">{email}</span>
            </p>
            <div className="mb-6 w-full rounded-lg border border-green-100 bg-green-50 p-4">
              <p className="text-sm text-green-800">
                Click the link in your email to sign in. The link expires in 5
                minutes.
              </p>
            </div>
            <button
              onClick={() => setSent(false)}
              className="text-sm font-medium text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Logo Section */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <PlauderaLogo className="h-7 w-7" />
        </div>
        <span className="text-2xl font-bold text-slate-900">Plaudera</span>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-xl md:p-10">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="text-slate-600">
            Enter your email to receive a magic link
          </p>
        </div>

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 transition-colors duration-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white shadow-md transition-all duration-200 hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Send Magic Link</span>
                <ArrowRight className="ml-2 h-4 w-4 -translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 font-medium text-slate-500">Or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 font-medium transition-all duration-200 hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <GoogleLogo className="mr-2.5 h-5 w-5" />
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 space-y-4 text-center">
        <p className="text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
          >
            Sign up
          </Link>
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
          <a
            href="/terms"
            className="transition-colors duration-200 hover:text-slate-700"
          >
            Terms
          </a>
          <span className="text-slate-300">•</span>
          <a
            href="/privacy"
            className="transition-colors duration-200 hover:text-slate-700"
          >
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}

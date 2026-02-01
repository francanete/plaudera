"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewClientProps {
  workspaceId: string;
}

export function PreviewClient({ workspaceId }: PreviewClientProps) {
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [widgetPosition, setWidgetPosition] = useState<
    "bottom-left" | "bottom-right"
  >("bottom-right");

  useEffect(() => {
    // Fetch widget settings to know the position
    fetch(`/api/widget/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.position) {
          setWidgetPosition(data.position);
        }
      })
      .catch(() => {
        // Default to bottom-right if fetch fails
      });
  }, []);

  useEffect(() => {
    // Dynamically inject the widget script
    const script = document.createElement("script");
    script.src = `${window.location.origin}/widget.js`;
    script.dataset.workspace = workspaceId;
    script.async = true;
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Cleanup: remove script and widget elements
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
      // Remove any widget-created DOM elements
      const widgetContainer = document.getElementById("plaudera-widget-root");
      if (widgetContainer) {
        widgetContainer.remove();
      }
    };
  }, [workspaceId]);

  return (
    <div className="min-h-screen bg-white">
      {/* Tour indicator - positioned where the widget button appears */}
      <div
        id="tour-widgetPreview-widget-button"
        className={`pointer-events-none fixed bottom-5 z-40 h-14 w-14 rounded-full ${
          widgetPosition === "bottom-left" ? "left-5" : "right-5"
        }`}
        aria-hidden="true"
      />
      {/* Floating back button */}
      <div className="fixed top-4 left-4 z-50">
        <Button asChild variant="secondary" size="sm" className="shadow-md">
          <Link href="/dashboard/widget">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      {/* Preview banner */}
      <div className="bg-indigo-600 px-4 py-2 text-center text-sm text-white">
        Widget Preview Mode — This is how your widget appears on a real website
      </div>

      {/* Dummy website mockup */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-900" />
            <span className="text-xl font-semibold text-gray-900">
              Acme Inc
            </span>
          </div>
          <nav className="hidden gap-6 md:flex">
            <span className="cursor-default text-gray-600 hover:text-gray-900">
              Home
            </span>
            <span className="cursor-default text-gray-600 hover:text-gray-900">
              Products
            </span>
            <span className="cursor-default text-gray-600 hover:text-gray-900">
              About
            </span>
            <span className="cursor-default text-gray-600 hover:text-gray-900">
              Contact
            </span>
          </nav>
          <div className="h-9 w-24 rounded-md bg-gray-900" />
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Welcome to Our Website
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            This is a preview of how your feedback widget appears on a real
            website. Try clicking the widget button to see it in action.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <div className="h-12 w-36 rounded-lg bg-indigo-600" />
            <div className="h-12 w-36 rounded-lg border-2 border-gray-300 bg-white" />
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-2xl font-semibold text-gray-900">
            Our Features
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 h-12 w-12 rounded-lg bg-indigo-100" />
                <div className="mb-2 h-6 w-32 rounded bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-5/6 rounded bg-gray-100" />
                  <div className="h-4 w-4/6 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content section */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 h-8 w-64 rounded bg-gray-300" />
          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-5 w-24 rounded bg-gray-300" />
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
            © 2024 Acme Inc. This is a preview website.
          </div>
        </div>
      </footer>
    </div>
  );
}

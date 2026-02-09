import Link from "next/link";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";

const isLtd = appConfig.pricing.mode === "ltd";

export function BlogCta() {
  return (
    <section className="bg-slate-900 py-24 text-white">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
          Ready to collect better feedback?
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-300 md:text-xl">
          {appConfig.name} helps you capture, organize, and prioritize feature
          requests{" "}
          {isLtd
            ? "— with lifetime access and no recurring fees."
            : "— start your free trial today, no credit card required."}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="h-12 w-full bg-white px-8 font-semibold text-slate-900 hover:bg-slate-100 sm:w-auto"
            asChild
          >
            <Link href="/pricing">
              {isLtd ? "Get Lifetime Access" : "Start Free Trial"}
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full border-slate-700 bg-transparent px-8 text-white hover:bg-slate-800 hover:text-white sm:w-auto"
            asChild
          >
            <Link href="/">See How It Works</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

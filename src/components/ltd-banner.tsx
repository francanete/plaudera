import Link from "next/link";

export function LtdBanner() {
  return (
    <div className="bg-primary text-primary-foreground py-2.5 text-center text-sm">
      <div className="container mx-auto flex items-center justify-center gap-3 px-4">
        <span>
          <strong>Limited Time Offer:</strong> Get lifetime access to Plaudera
          — pay once, use forever.
        </span>
        <Link
          href="/pricing"
          className="bg-primary-foreground text-primary inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold transition-opacity hover:opacity-90"
        >
          See Pricing →
        </Link>
      </div>
    </div>
  );
}

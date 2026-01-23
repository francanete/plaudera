import { cn } from "@/lib/utils";

interface PlauderaLogoProps {
  className?: string;
}

/**
 * Custom Plaudera logo — stacked diamond planes inspired by the
 * Lucide Layers icon, with a cleaner, more refined look.
 */
export function PlauderaLogo({ className }: PlauderaLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {/* Top layer */}
      <path d="M12 3L3 8.5L12 14L21 8.5L12 3Z" fill="currentColor" />
      {/* Middle layer */}
      <path
        d="M3 12.5L12 18L21 12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom layer */}
      <path
        d="M3 16.5L12 22L21 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

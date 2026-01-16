"use client";

interface TourOverlayProps {
  targetRect: DOMRect | null;
  padding?: number;
  borderRadius?: number;
}

export function TourOverlay({
  targetRect,
  padding = 4,
  borderRadius = 12,
}: TourOverlayProps) {
  // If no target, show full overlay
  if (!targetRect) {
    return (
      <div
        className="animate-in fade-in-0 fixed inset-0 z-40 bg-black/70 duration-300"
        aria-hidden="true"
      />
    );
  }

  // Calculate hole position with padding
  const x = targetRect.left - padding;
  const y = targetRect.top - padding;
  const width = targetRect.width + padding * 2;
  const height = targetRect.height + padding * 2;

  return (
    <svg
      className="animate-in fade-in-0 fixed inset-0 z-40 h-full w-full duration-300"
      aria-hidden="true"
    >
      <defs>
        <mask id="spotlight-mask">
          {/* White = visible (shows the overlay), Black = hidden (the hole) */}
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={borderRadius}
            ry={borderRadius}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.7)"
        mask="url(#spotlight-mask)"
      />
    </svg>
  );
}

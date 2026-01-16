"use client";

import { useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { TourStep } from "@/lib/onboarding-config";

interface TourCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: DOMRect;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function calculateCardPosition(
  targetRect: DOMRect,
  preferredPosition: TourStep["position"]
) {
  const cardWidth = 320;
  const cardHeight = 180;
  const padding = 16;

  // Calculate available space in each direction
  const spaceTop = targetRect.top - padding;
  const spaceBottom = window.innerHeight - targetRect.bottom - padding;
  const spaceLeft = targetRect.left - padding;
  const spaceRight = window.innerWidth - targetRect.right - padding;

  // Find the best position with most space
  const positions = [
    { pos: "bottom" as const, space: spaceBottom, needed: cardHeight },
    { pos: "top" as const, space: spaceTop, needed: cardHeight },
    { pos: "right" as const, space: spaceRight, needed: cardWidth },
    { pos: "left" as const, space: spaceLeft, needed: cardWidth },
  ];

  // Check if preferred position has enough space
  const preferred = positions.find((p) => p.pos === preferredPosition);
  let actualPosition = preferredPosition;

  if (!preferred || preferred.space < preferred.needed + padding) {
    // Find position with most available space that fits
    const sorted = positions
      .filter((p) => p.space >= p.needed + padding)
      .sort((a, b) => b.space - a.space);
    if (sorted.length > 0) {
      actualPosition = sorted[0].pos;
    }
  }

  let top = 0;
  let left = 0;

  switch (actualPosition) {
    case "bottom":
      top = targetRect.bottom + padding;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
      break;
    case "top":
      top = targetRect.top - cardHeight - padding;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.left - cardWidth - padding;
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.right + padding;
      break;
  }

  // Keep card within viewport (horizontal only - don't clamp vertical to avoid overlap)
  left = Math.max(
    padding,
    Math.min(left, window.innerWidth - cardWidth - padding)
  );

  // For vertical, ensure we don't overlap with target
  const cardBottom = top + cardHeight;
  const cardRight = left + cardWidth;

  // Check for overlap and adjust
  const overlapsVertically =
    cardBottom > targetRect.top && top < targetRect.bottom;
  const overlapsHorizontally =
    cardRight > targetRect.left && left < targetRect.right;

  if (overlapsVertically && overlapsHorizontally) {
    // Force position below or above target without clamping into it
    if (spaceBottom >= cardHeight) {
      top = targetRect.bottom + padding;
    } else if (spaceTop >= cardHeight) {
      top = targetRect.top - cardHeight - padding;
    }
  }

  // Final viewport bounds (but prioritize not overlapping)
  top = Math.max(padding, top);

  return { top, left };
}

export function TourCard({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onClose,
}: TourCardProps) {
  // Compute position from props - no effect needed since it's derived data
  const position = useMemo(
    () => calculateCardPosition(targetRect, step.position),
    [targetRect, step.position]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Card
      key={currentStep}
      className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 fixed z-50 w-[320px] max-w-[calc(100vw-32px)] shadow-xl duration-200"
      style={{ top: position.top, left: position.left }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{step.title}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-muted-foreground text-sm">{step.content}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {currentStep + 1} of {totalSteps}
        </span>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" size="sm" onClick={onPrev}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {currentStep === totalSteps - 1 ? "Get Started!" : "Next"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

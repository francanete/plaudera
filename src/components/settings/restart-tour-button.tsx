"use client";

import { Button } from "@/components/ui/button";
import { useOnboardingContext } from "@/components/onboarding/onboarding-provider";
import { PlayCircle } from "lucide-react";

export function RestartTourButton() {
  const { startTour } = useOnboardingContext();

  return (
    <Button variant="outline" onClick={() => startTour()}>
      <PlayCircle className="mr-2 h-4 w-4" />
      Restart Tour
    </Button>
  );
}

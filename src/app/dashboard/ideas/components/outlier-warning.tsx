"use client";

import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConcentrationWarning } from "@/lib/confidence";

interface OutlierWarningProps {
  warning: ConcentrationWarning;
}

export function OutlierWarning({ warning }: OutlierWarningProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {warning.share}% from {warning.domain}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64" side="bottom">
          <p className="text-xs">
            Loud-minority detected: {warning.share}% of organic votes come from{" "}
            <strong>{warning.domain}</strong>.
            {warning.blocksStrong
              ? " This blocks the Strong Signal label."
              : " Demand may not represent broader user base."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

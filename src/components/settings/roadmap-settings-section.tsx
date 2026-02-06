"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, List } from "lucide-react";
import { toast } from "sonner";

interface RoadmapSettingsSectionProps {
  initialRoadmapDefaultListView: boolean;
}

export function RoadmapSettingsSection({
  initialRoadmapDefaultListView,
}: RoadmapSettingsSectionProps) {
  const [roadmapDefaultListView, setRoadmapDefaultListView] = useState(
    initialRoadmapDefaultListView
  );
  const [isPending, startTransition] = useTransition();

  const handleChange = (checked: boolean) => {
    const previousValue = roadmapDefaultListView;
    setRoadmapDefaultListView(checked);

    startTransition(async () => {
      try {
        const res = await fetch("/api/board/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roadmapDefaultListView: checked }),
        });

        if (!res.ok) {
          throw new Error("Failed to save");
        }

        toast.success("Roadmap setting saved");
      } catch (error) {
        console.error(
          "[RoadmapSettingsSection] Failed to update setting:",
          error
        );
        setRoadmapDefaultListView(previousValue);
        toast.error("Failed to save setting");
      }
    });
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <List className="h-4 w-4 flex-shrink-0 text-slate-500" />
          <Label
            htmlFor="roadmap-list-view"
            className="text-sm text-slate-700 sm:text-base"
          >
            Default to list view
          </Label>
          {isPending && (
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />
          )}
        </div>
        <Switch
          id="roadmap-list-view"
          checked={roadmapDefaultListView}
          onCheckedChange={handleChange}
          disabled={isPending}
          className="flex-shrink-0"
        />
      </div>
      <p className="text-xs text-slate-500 sm:text-sm">
        When enabled, the public roadmap defaults to list view for all visitors.
        When disabled, desktop users see the board view while mobile users
        automatically see list view.
      </p>
    </div>
  );
}

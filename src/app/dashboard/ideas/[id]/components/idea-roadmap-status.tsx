"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoadmapStatus } from "@/lib/db/schema";
import {
  ALL_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
} from "@/lib/roadmap-status-config";

interface IdeaRoadmapStatusProps {
  status: RoadmapStatus;
  onStatusChange: (status: RoadmapStatus) => void;
}

export function IdeaRoadmapStatus({
  status,
  onStatusChange,
}: IdeaRoadmapStatusProps) {
  const StatusIcon = ROADMAP_STATUS_CONFIG[status].icon;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-500">
        Roadmap Status
      </label>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[200px] border-slate-200 bg-white hover:bg-slate-50">
          <StatusIcon className="mr-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_ROADMAP_STATUSES.map((opt) => {
            const cfg = ROADMAP_STATUS_CONFIG[opt];
            const Icon = cfg.icon;
            return (
              <SelectItem key={opt} value={opt}>
                <div className="flex items-center">
                  <Icon className="mr-2 h-4 w-4" />
                  {cfg.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

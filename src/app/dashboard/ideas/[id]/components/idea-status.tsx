"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitMerge } from "lucide-react";
import type { IdeaStatus as IdeaStatusType } from "@/lib/db/schema";
import {
  SELECTABLE_IDEA_STATUSES,
  IDEA_STATUS_CONFIG,
} from "@/lib/idea-status-config";

interface IdeaStatusProps {
  status: IdeaStatusType;
  onStatusChange: (status: IdeaStatusType) => void;
}

export function IdeaStatus({ status, onStatusChange }: IdeaStatusProps) {
  const StatusIcon = IDEA_STATUS_CONFIG[status].icon;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-500">Status</label>
      {status === "MERGED" ? (
        <div>
          <Badge
            variant="secondary"
            className="gap-1.5 border-slate-200 bg-slate-100 text-slate-700"
          >
            <GitMerge className="h-3.5 w-3.5" />
            Merged
          </Badge>
        </div>
      ) : (
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[200px] border-slate-200 bg-white hover:bg-slate-50">
            <StatusIcon className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SELECTABLE_IDEA_STATUSES.map((opt) => {
              const cfg = IDEA_STATUS_CONFIG[opt];
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
      )}
    </div>
  );
}

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IdeaClassificationProps {
  frequencyTag: string | null;
  workflowImpact: string | null;
  workflowStage: string | null;
  onSave: (field: string, value: string | null) => void;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "rarely", label: "Rarely" },
];

const IMPACT_OPTIONS = [
  { value: "blocker", label: "Blocker" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "nice_to_have", label: "Nice to have" },
];

const STAGE_OPTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "setup", label: "Setup" },
  { value: "daily_workflow", label: "Daily workflow" },
  { value: "billing", label: "Billing" },
  { value: "reporting", label: "Reporting" },
  { value: "integrations", label: "Integrations" },
  { value: "other", label: "Other" },
];

export function IdeaClassification({
  frequencyTag,
  workflowImpact,
  workflowStage,
  onSave,
}: IdeaClassificationProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Classification</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ClassificationSelect
          label="Frequency"
          value={frequencyTag}
          options={FREQUENCY_OPTIONS}
          onChange={(val) => onSave("frequencyTag", val)}
        />
        <ClassificationSelect
          label="Impact"
          value={workflowImpact}
          options={IMPACT_OPTIONS}
          onChange={(val) => onSave("workflowImpact", val)}
        />
        <ClassificationSelect
          label="Workflow stage"
          value={workflowStage}
          options={STAGE_OPTIONS}
          onChange={(val) => onSave("workflowStage", val)}
        />
      </div>
    </div>
  );
}

function ClassificationSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      <Select
        value={value || ""}
        onValueChange={(val) => onChange(val || null)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Not set" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

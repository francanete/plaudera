"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, FileText, User, LayoutGrid, Map } from "lucide-react";
import type { RoadmapStatus } from "@/lib/db/schema";

interface IdeaContentTabsProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  onSaveDescription: () => void;
  isSavingDescription: boolean;
  hasDescriptionChanges: boolean;

  publicUpdate: string;
  onPublicUpdateChange: (value: string) => void;
  onSavePublicUpdate: () => void;
  isSavingPublicUpdate: boolean;
  hasPublicUpdateChanges: boolean;

  featureDetails: string;
  onFeatureDetailsChange: (value: string) => void;
  onSaveFeatureDetails: () => void;
  isSavingFeatureDetails: boolean;
  hasFeatureDetailsChanges: boolean;

  roadmapStatus: RoadmapStatus;
}

type TabValue = "description" | "public-update" | "feature-details";

const TAB_CONFIG: Record<
  TabValue,
  {
    label: string;
    icon: typeof User;
    dotColor?: string;
    visibility: { label: string; color: string; icon: typeof Globe }[];
    helpText: string;
  }
> = {
  description: {
    label: "Contributor's Idea",
    icon: User,
    visibility: [
      { label: "Board", color: "blue", icon: LayoutGrid },
      { label: "Roadmap (fallback)", color: "purple", icon: Map },
    ],
    helpText:
      "The original idea submitted by the contributor. Shown on the public board.",
  },
  "public-update": {
    label: "Public Update",
    icon: Globe,
    dotColor: "bg-blue-500",
    visibility: [{ label: "Board", color: "blue", icon: LayoutGrid }],
    helpText:
      "Share progress updates with your users. This appears on the public feedback board below the description.",
  },
  "feature-details": {
    label: "Feature Details",
    icon: FileText,
    dotColor: "bg-purple-500",
    visibility: [{ label: "Roadmap", color: "purple", icon: Map }],
    helpText:
      "Technical specifications and detailed feature scope. Shown only on your public roadmap page.",
  },
};

export function IdeaContentTabs({
  description,
  onDescriptionChange,
  onSaveDescription,
  isSavingDescription,
  hasDescriptionChanges,
  publicUpdate,
  onPublicUpdateChange,
  onSavePublicUpdate,
  isSavingPublicUpdate,
  hasPublicUpdateChanges,
  featureDetails,
  onFeatureDetailsChange,
  onSaveFeatureDetails,
  isSavingFeatureDetails,
  hasFeatureDetailsChanges,
  roadmapStatus,
}: IdeaContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("description");

  // Only show Feature Details tab when idea is on the roadmap
  const showFeatureDetails = roadmapStatus !== "NONE";
  const visibleTabs: TabValue[] = showFeatureDetails
    ? ["description", "public-update", "feature-details"]
    : ["description", "public-update"];

  return (
    <div className="w-full">
      {/* Tab Container */}
      <div className="border-b border-gray-200 bg-gray-50/50">
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100/50 p-1">
          {visibleTabs.map((tab) => {
            const config = TAB_CONFIG[tab];
            const Icon = config.icon;
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                } `}
              >
                {/* Icon with optional dot overlay */}
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {config.dotColor && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 ${config.dotColor} rounded-full border border-white`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "description" && (
          <ContentField
            value={description}
            onChange={onDescriptionChange}
            onSave={onSaveDescription}
            isSaving={isSavingDescription}
            hasChanges={hasDescriptionChanges}
            placeholder="Add a description of this idea..."
            config={TAB_CONFIG.description}
          />
        )}

        {activeTab === "public-update" && (
          <ContentField
            value={publicUpdate}
            onChange={onPublicUpdateChange}
            onSave={onSavePublicUpdate}
            isSaving={isSavingPublicUpdate}
            hasChanges={hasPublicUpdateChanges}
            placeholder="Share progress or updates with your users..."
            maxLength={1000}
            config={TAB_CONFIG["public-update"]}
          />
        )}

        {activeTab === "feature-details" && showFeatureDetails && (
          <ContentField
            value={featureDetails}
            onChange={onFeatureDetailsChange}
            onSave={onSaveFeatureDetails}
            isSaving={isSavingFeatureDetails}
            hasChanges={hasFeatureDetailsChanges}
            placeholder="Describe the feature specs, scope, and what you're building..."
            maxLength={2000}
            config={TAB_CONFIG["feature-details"]}
          />
        )}
      </div>
    </div>
  );
}

interface ContentFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  placeholder: string;
  maxLength?: number;
  config: (typeof TAB_CONFIG)[TabValue];
}

function ContentField({
  value,
  onChange,
  onSave,
  isSaving,
  hasChanges,
  placeholder,
  maxLength,
  config,
}: ContentFieldProps) {
  return (
    <div className="space-y-3">
      {/* Visibility Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Appears on:</span>
        {config.visibility.map((vis) => {
          const VisIcon = vis.icon;
          const colorClasses =
            vis.color === "blue"
              ? "border-blue-200 bg-blue-50 text-blue-600"
              : "border-purple-200 bg-purple-50 text-purple-600";
          return (
            <Badge
              key={vis.label}
              variant="outline"
              className={`gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${colorClasses}`}
            >
              <VisIcon className="h-3 w-3" />
              {vis.label}
            </Badge>
          );
        })}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-400">{config.helpText}</p>

      {/* Textarea */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[140px] resize-none border-gray-100 bg-gray-50/30 focus:border-gray-300 focus:ring-0"
        maxLength={maxLength}
      />

      {/* Footer with Character Count and Save Button */}
      <div className="flex items-center justify-between">
        {maxLength ? (
          <span className="text-xs text-gray-400">
            {value.length}/{maxLength}
          </span>
        ) : (
          <span />
        )}
        {hasChanges && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="bg-gray-900 hover:bg-gray-800"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}

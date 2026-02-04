"use client";

import { useState, useRef, useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
}

type TabValue = "description" | "public-update";

const TAB_CONFIG: Record<
  TabValue,
  {
    label: string;
    visibilityText: string;
    helpText: string;
  }
> = {
  description: {
    label: "Contributor's Idea",
    visibilityText: "Board · Roadmap (fallback)",
    helpText:
      "The original idea submitted by the contributor. Shown on the public board.",
  },
  "public-update": {
    label: "Team Update",
    visibilityText: "",
    helpText:
      "Share progress updates with your users. This appears on the public feedback board below the description.",
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
}: IdeaContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("description");
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabValue, HTMLButtonElement>>(new Map());

  const visibleTabs: TabValue[] = ["description", "public-update"];

  // Update indicator position
  useEffect(() => {
    const activeButton = tabRefs.current.get(activeTab);
    if (activeButton && tabsRef.current) {
      const containerRect = tabsRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab]);

  return (
    <div className="w-full">
      {/* Underline-style Tab Bar */}
      <div className="border-border relative border-b" ref={tabsRef}>
        <div className="flex gap-1">
          {visibleTabs.map((tab) => {
            const config = TAB_CONFIG[tab];
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab, el);
                }}
                onClick={() => setActiveTab(tab)}
                className={`relative px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 sm:py-3 sm:text-sm ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Animated Underline Indicator */}
        <div
          className="bg-primary absolute bottom-0 h-0.5 transition-all duration-200 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>

      {/* Tab Content Area */}
      <div className="bg-muted/30 mt-6 rounded-lg p-4">
        {activeTab === "description" && (
          <ContentField
            value={description}
            onChange={onDescriptionChange}
            onSave={onSaveDescription}
            isSaving={isSavingDescription}
            hasChanges={hasDescriptionChanges}
            placeholder="Add a description of this idea..."
            config={TAB_CONFIG.description}
            warningText="You are updating the contributor's original description"
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
  warningText?: string;
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
  warningText,
}: ContentFieldProps) {
  return (
    <div className="space-y-4">
      {warningText ? (
        hasChanges && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <TriangleAlert className="size-3.5 shrink-0" />
            <span className="font-medium">{warningText}</span>
          </div>
        )
      ) : config.visibilityText ? (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>Visible on:</span>
          <span className="font-medium">{config.visibilityText}</span>
        </div>
      ) : null}

      {/* Borderless Textarea with focus underline */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground/50 min-h-[140px] resize-none border-0 bg-transparent px-0 shadow-none focus:ring-0 focus-visible:ring-0"
          maxLength={maxLength}
        />
        {/* Subtle focus indicator line */}
        <div className="bg-border focus-within:bg-primary absolute bottom-0 left-0 h-px w-full transition-colors" />
      </div>

      {/* Footer with Character Count and Animated Save Button */}
      <div className="flex items-center justify-between">
        {maxLength ? (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {value.length}/{maxLength}
          </span>
        ) : (
          <span />
        )}

        {/* Animated Save Button */}
        <div
          className={`transition-all duration-200 ${
            hasChanges
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

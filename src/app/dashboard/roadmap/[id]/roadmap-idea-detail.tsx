"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  ChevronRight,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Idea, RoadmapStatus } from "@/lib/db/schema";
import {
  VISIBLE_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
} from "@/lib/roadmap-status-config";
import { RoadmapIdeaCard } from "@/components/board/roadmap-idea-card";
import { IdeaInternalNote } from "@/app/dashboard/ideas/[id]/components/idea-internal-note";
import { IdeaMeta } from "@/app/dashboard/ideas/[id]/components/idea-meta";

interface StatusChange {
  id: string;
  fromStatus: RoadmapStatus;
  toStatus: RoadmapStatus;
  changedAt: string;
}

interface RoadmapIdeaDetailProps {
  idea: Idea;
}

type TabValue = "feature-details" | "public-update" | "description";

const TAB_CONFIG: Record<
  TabValue,
  { label: string; visibilityText: string; helpText: string }
> = {
  "feature-details": {
    label: "Feature Details",
    visibilityText: "Roadmap",
    helpText:
      "Technical specifications and detailed feature scope. Shown only on your public roadmap page.",
  },
  "public-update": {
    label: "Public Update",
    visibilityText: "Board",
    helpText:
      "Share progress updates with your users. This appears on the public feedback board below the description.",
  },
  description: {
    label: "Contributor's Idea",
    visibilityText: "Board · Roadmap (fallback)",
    helpText:
      "The original idea submitted by the contributor. Read-only reference.",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RoadmapIdeaDetail({
  idea: initialIdea,
}: RoadmapIdeaDetailProps) {
  const [idea, setIdea] = useState(initialIdea);
  const [title, setTitle] = useState(idea.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const [featureDetails, setFeatureDetails] = useState(
    idea.featureDetails || ""
  );
  const [isSavingFeatureDetails, setIsSavingFeatureDetails] = useState(false);

  const [publicUpdate, setPublicUpdate] = useState(idea.publicUpdate || "");
  const [isSavingPublicUpdate, setIsSavingPublicUpdate] = useState(false);

  const [showPublicUpdateOnRoadmap, setShowPublicUpdateOnRoadmap] = useState(
    idea.showPublicUpdateOnRoadmap
  );

  const [internalNote, setInternalNote] = useState(idea.internalNote || "");
  const [isSavingInternalNote, setIsSavingInternalNote] = useState(false);

  const [roadmapHistory, setRoadmapHistory] = useState<StatusChange[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabValue>("feature-details");
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabValue, HTMLButtonElement>>(new Map());

  const featureDetailsChanged = featureDetails !== (idea.featureDetails || "");
  const publicUpdateChanged = publicUpdate !== (idea.publicUpdate || "");
  const internalNoteChanged = internalNote !== (idea.internalNote || "");

  // Fetch roadmap history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/ideas/${idea.id}/roadmap-history`);
        if (res.ok) {
          const data = await res.json();
          setRoadmapHistory(data.changes);
        }
      } catch {
        // Silently fail - history is not critical
      }
    }
    fetchHistory();
  }, [idea.id]);

  // Update tab indicator position
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

  const handleTitleBlur = async () => {
    if (title === idea.title || !title.trim()) {
      setTitle(idea.title);
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) throw new Error();

      setIdea((prev) => ({ ...prev, title: title.trim() }));
      toast.success("Title updated");
    } catch {
      setTitle(idea.title);
      toast.error("Failed to update title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleRoadmapStatusChange = async (newStatus: RoadmapStatus) => {
    const previousStatus = idea.roadmapStatus;
    setIdea((prev) => ({ ...prev, roadmapStatus: newStatus }));

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmapStatus: newStatus }),
      });

      if (!res.ok) throw new Error();

      // Refresh history
      const historyRes = await fetch(`/api/ideas/${idea.id}/roadmap-history`);
      if (historyRes.ok) {
        const data = await historyRes.json();
        setRoadmapHistory(data.changes);
      }

      toast.success("Roadmap status updated");
    } catch {
      setIdea((prev) => ({ ...prev, roadmapStatus: previousStatus }));
      toast.error("Failed to update roadmap status");
    }
  };

  const handleSaveFeatureDetails = async () => {
    setIsSavingFeatureDetails(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureDetails: featureDetails || null }),
      });

      if (!res.ok) throw new Error();

      setIdea((prev) => ({ ...prev, featureDetails: featureDetails || null }));
      toast.success("Feature details saved");
    } catch {
      toast.error("Failed to save feature details");
    } finally {
      setIsSavingFeatureDetails(false);
    }
  };

  const handleSavePublicUpdate = async () => {
    setIsSavingPublicUpdate(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicUpdate: publicUpdate || null }),
      });

      if (!res.ok) throw new Error();

      setIdea((prev) => ({ ...prev, publicUpdate: publicUpdate || null }));
      toast.success("Public update saved");
    } catch {
      toast.error("Failed to save public update");
    } finally {
      setIsSavingPublicUpdate(false);
    }
  };

  const handleToggleShowOnRoadmap = async (checked: boolean) => {
    const previous = showPublicUpdateOnRoadmap;
    setShowPublicUpdateOnRoadmap(checked);
    setIdea((prev) => ({ ...prev, showPublicUpdateOnRoadmap: checked }));

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showPublicUpdateOnRoadmap: checked }),
      });

      if (!res.ok) throw new Error();

      toast.success(
        checked
          ? "Public update visible on roadmap"
          : "Public update hidden from roadmap"
      );
    } catch {
      setShowPublicUpdateOnRoadmap(previous);
      setIdea((prev) => ({ ...prev, showPublicUpdateOnRoadmap: previous }));
      toast.error("Failed to update setting");
    }
  };

  const handleSaveInternalNote = async () => {
    setIsSavingInternalNote(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote: internalNote || null }),
      });

      if (!res.ok) throw new Error();

      setIdea((prev) => ({ ...prev, internalNote: internalNote || null }));
      toast.success("Internal note saved");
    } catch {
      toast.error("Failed to save internal note");
    } finally {
      setIsSavingInternalNote(false);
    }
  };

  const visibleTabs: TabValue[] = [
    "feature-details",
    "public-update",
    "description",
  ];

  return (
    <div className="xl:grid xl:grid-cols-[1fr_360px] xl:gap-8">
      {/* Left: Editor */}
      <div className="space-y-10">
        {/* Contextual Toolbar */}
        <div className="flex items-center justify-between">
          {/* Left: Back navigation */}
          <Link href="/dashboard/roadmap" className="group inline-flex">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2 px-2 transition-colors hover:bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="text-sm">Roadmap</span>
            </Button>
          </Link>

          {/* Right: Status badge + Vote count */}
          <div className="flex items-center gap-3">
            {(() => {
              const statusConfig = ROADMAP_STATUS_CONFIG[idea.roadmapStatus];
              const StatusIcon = statusConfig.icon;
              return (
                <Badge
                  variant="outline"
                  className={statusConfig.badgeClassName}
                >
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {statusConfig.shortLabel}
                </Badge>
              );
            })()}
            <div className="text-muted-foreground flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium tabular-nums">
                {idea.voteCount}
              </span>
            </div>
          </div>
        </div>

        {/* Editable Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          disabled={isSavingTitle}
          className="text-foreground placeholder:text-muted-foreground/50 h-auto border-transparent bg-transparent px-0 py-0 text-3xl font-semibold tracking-tight hover:border-transparent focus:border-transparent focus:ring-0 sm:text-4xl md:text-5xl"
          placeholder="Feature title"
        />

        {/* Roadmap Status Selector */}
        <Select
          value={idea.roadmapStatus}
          onValueChange={(value) =>
            handleRoadmapStatusChange(value as RoadmapStatus)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              {(() => {
                const currentConfig = ROADMAP_STATUS_CONFIG[idea.roadmapStatus];
                const CurrentIcon = currentConfig.icon;
                return (
                  <>
                    <CurrentIcon className="h-4 w-4" />
                    {currentConfig.label}
                  </>
                );
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {VISIBLE_ROADMAP_STATUSES.map((status) => {
              const config = ROADMAP_STATUS_CONFIG[status];
              const Icon = config.icon;
              return (
                <SelectItem key={status} value={status}>
                  <Icon className="h-4 w-4" />
                  {config.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Content Tabs */}
        <div className="w-full">
          <div className="border-border relative border-b" ref={tabsRef}>
            <div className="flex gap-1">
              {visibleTabs.map((tab) => {
                const config = TAB_CONFIG[tab];
                const isActiveTab = activeTab === tab;

                return (
                  <button
                    key={tab}
                    ref={(el) => {
                      if (el) tabRefs.current.set(tab, el);
                    }}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 sm:py-3 sm:text-sm ${
                      isActiveTab
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>

            <div
              className="bg-primary absolute bottom-0 h-0.5 transition-all duration-200 ease-out"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
            />
          </div>

          <div className="bg-muted/30 mt-6 rounded-lg p-4">
            {activeTab === "feature-details" && (
              <div className="space-y-4">
                {!featureDetails && idea.description && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                    <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                      No feature details provided. The contributor&apos;s
                      original idea is shown on your public roadmap instead.
                    </p>
                  </div>
                )}
                <ContentField
                  value={featureDetails}
                  onChange={setFeatureDetails}
                  onSave={handleSaveFeatureDetails}
                  isSaving={isSavingFeatureDetails}
                  hasChanges={featureDetailsChanged}
                  placeholder="Describe the feature specs, scope, and what you're building..."
                  maxLength={2000}
                />
              </div>
            )}

            {activeTab === "public-update" && (
              <ContentField
                value={publicUpdate}
                onChange={setPublicUpdate}
                onSave={handleSavePublicUpdate}
                isSaving={isSavingPublicUpdate}
                hasChanges={publicUpdateChanged}
                placeholder="Share progress or updates with your users..."
                maxLength={1000}
              />
            )}

            {activeTab === "description" && (
              <ContentField
                value={idea.description || ""}
                onChange={() => {}}
                onSave={() => {}}
                isSaving={false}
                hasChanges={false}
                placeholder="No description provided by the contributor."
                readOnly
              />
            )}
          </div>
        </div>

        {/* Show Public Update on Roadmap Card Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="space-y-0.5">
            <Label
              htmlFor="show-update-on-roadmap"
              className="text-sm font-medium"
            >
              Show public update on roadmap card
            </Label>
            <p className="text-muted-foreground text-xs">
              When enabled, the public update text appears on the roadmap board
              card.
            </p>
          </div>
          <Switch
            id="show-update-on-roadmap"
            checked={showPublicUpdateOnRoadmap}
            onCheckedChange={handleToggleShowOnRoadmap}
          />
        </div>

        {/* Internal Note */}
        <IdeaInternalNote
          note={internalNote}
          onNoteChange={setInternalNote}
          onSave={handleSaveInternalNote}
          isSaving={isSavingInternalNote}
          hasChanges={internalNoteChanged}
        />

        {/* Meta */}
        <IdeaMeta createdAt={idea.createdAt} authorEmail={idea.authorEmail} />

        {/* Status History */}
        {roadmapHistory.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors">
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    historyOpen ? "rotate-90" : ""
                  }`}
                />
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Status history{" "}
                  <span className="font-mono text-xs tabular-nums">
                    ({roadmapHistory.length})
                  </span>
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-border mt-3 ml-1 space-y-0 border-l pl-4">
                {roadmapHistory.map((change) => {
                  const toConfig = ROADMAP_STATUS_CONFIG[change.toStatus];
                  return (
                    <div
                      key={change.id}
                      className="relative flex items-center gap-3 py-2"
                    >
                      <div className="bg-border absolute -left-[17px] h-2 w-2 rounded-full" />
                      <span
                        className={`text-sm font-medium ${ROADMAP_STATUS_CONFIG[change.toStatus].textColor}`}
                      >
                        {toConfig.label}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs tabular-nums">
                        {formatDate(change.changedAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Right: Live Preview (hidden below xl) */}
      <aside className="hidden xl:block">
        <div className="sticky top-20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <p className="text-muted-foreground text-xs font-medium">
              Live preview
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <RoadmapIdeaCard
              idea={{
                id: idea.id,
                title,
                description: idea.description,
                roadmapStatus: idea.roadmapStatus,
                featureDetails: featureDetails || null,
                publicUpdate: publicUpdate || null,
                showPublicUpdateOnRoadmap,
                voteCount: idea.voteCount,
              }}
            />
          </div>
        </div>
      </aside>
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
  readOnly?: boolean;
}

function ContentField({
  value,
  onChange,
  onSave,
  isSaving,
  hasChanges,
  placeholder,
  maxLength,
  readOnly,
}: ContentFieldProps) {
  return (
    <div className="space-y-4">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`placeholder:text-muted-foreground/50 min-h-[140px] resize-none border-0 bg-transparent px-0 shadow-none focus:ring-0 focus-visible:ring-0 ${
          readOnly ? "opacity-60" : ""
        }`}
        maxLength={maxLength}
        readOnly={readOnly}
      />

      <div className="flex items-center justify-between">
        {maxLength && !readOnly ? (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {value.length}/{maxLength}
          </span>
        ) : (
          <span />
        )}

        {!readOnly && (
          <div
            className={`transition-all duration-200 ${
              hasChanges
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

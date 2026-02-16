"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoadmapStatus } from "@/lib/db/schema";
import {
  VISIBLE_ROADMAP_STATUSES,
  ROADMAP_STATUS_CONFIG,
  ROADMAP_ICON_COLORS,
} from "@/lib/roadmap-status-config";
import { RoadmapIdeaCard } from "@/components/board/roadmap-idea-card";

export function RoadmapIdeaForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roadmapStatus, setRoadmapStatus] = useState<RoadmapStatus>("PLANNED");
  const [featureDetails, setFeatureDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          roadmapStatus,
          featureDetails: featureDetails.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create idea");
      }

      toast.success("Roadmap idea created");
      router.push("/dashboard/roadmap");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create idea");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentConfig = ROADMAP_STATUS_CONFIG[roadmapStatus];
  const CurrentIcon = currentConfig.icon;
  const currentColors = ROADMAP_ICON_COLORS[roadmapStatus];

  return (
    <div className="xl:grid xl:grid-cols-[1fr_360px] xl:gap-8">
      {/* Left: Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Feature title"
            maxLength={200}
            required
          />
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {title.length}/200
          </p>
        </div>

        {/* Roadmap Status */}
        <div className="space-y-2">
          <Label>Roadmap Status</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group border-border bg-background hover:border-muted-foreground/30 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all hover:shadow-sm"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${currentColors.bg}`}
                >
                  <CurrentIcon className={`h-3 w-3 ${currentColors.text}`} />
                </span>
                <span className="text-foreground text-sm font-medium">
                  {currentConfig.label}
                </span>
                <ChevronDown className="text-muted-foreground h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-45">
              {VISIBLE_ROADMAP_STATUSES.map((status) => {
                const config = ROADMAP_STATUS_CONFIG[status];
                const Icon = config.icon;
                const colors = ROADMAP_ICON_COLORS[status];
                const isSelected = status === roadmapStatus;
                return (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setRoadmapStatus(status)}
                    className="gap-2"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${colors.bg}`}
                    >
                      <Icon className={`h-3 w-3 ${colors.text}`} />
                    </span>
                    <span className="flex-1">{config.label}</span>
                    {isSelected && (
                      <Check className="text-muted-foreground h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Feature Details */}
        <div className="space-y-2">
          <Label htmlFor="featureDetails">Feature Details</Label>
          <p className="text-muted-foreground text-xs">
            Technical specs shown on your public roadmap page.
          </p>
          <Textarea
            id="featureDetails"
            value={featureDetails}
            onChange={(e) => setFeatureDetails(e.target.value)}
            placeholder="Describe the feature specs, scope, and what you're building..."
            maxLength={2000}
            className="min-h-25 resize-none"
          />
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {featureDetails.length}/2000
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Creating..." : "Create Roadmap Idea"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard/roadmap")}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Right: Live Preview */}
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
                id: "preview",
                title: title || "Feature title",
                description: null,
                roadmapStatus,
                featureDetails: featureDetails || null,
                publicUpdate: null,
                showPublicUpdateOnRoadmap: false,
                voteCount: 0,
              }}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

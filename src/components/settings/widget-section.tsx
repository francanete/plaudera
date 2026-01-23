"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Copy, Code2, Loader2, Plus, X, Globe, Route, Type } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { appConfig } from "@/lib/config";
import type { WidgetPosition } from "@/lib/db/schema";

const MAX_ALLOWED_ORIGINS = 10;
const MAX_PAGE_RULES = 20;

/**
 * Validate and normalize an origin URL (client-side).
 * Returns the normalized origin or null if invalid.
 */
function normalizeOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

interface WidgetSectionProps {
  workspaceSlug: string;
  initialPosition: WidgetPosition;
  initialAllowedOrigins: string[];
  initialPageRules: string[];
  initialShowLabel: boolean;
}

export function WidgetSection({
  workspaceSlug,
  initialPosition,
  initialAllowedOrigins,
  initialPageRules,
  initialShowLabel,
}: WidgetSectionProps) {
  const [position, setPosition] = useState<WidgetPosition>(initialPosition);
  const [showLabel, setShowLabel] = useState(initialShowLabel);
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>(
    initialAllowedOrigins
  );
  const [newOrigin, setNewOrigin] = useState("");
  const [originError, setOriginError] = useState<string | null>(null);
  const [pageRules, setPageRules] = useState<string[]>(initialPageRules);
  const [newRule, setNewRule] = useState("");
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isOriginPending, startOriginTransition] = useTransition();
  const [isRulePending, startRuleTransition] = useTransition();
  const [isLabelPending, startLabelTransition] = useTransition();
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handlePositionChange = (newPosition: WidgetPosition) => {
    const previousPosition = position;
    setPosition(newPosition); // Optimistic update

    startTransition(async () => {
      try {
        const res = await fetch("/api/widget/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: newPosition }),
        });

        if (!res.ok) {
          throw new Error("Failed to save");
        }

        toast.success("Position saved");
      } catch (error) {
        console.error("[WidgetSection] Failed to update position:", error);
        setPosition(previousPosition); // Revert on error
        toast.error("Failed to save position");
      }
    });
  };

  const handleShowLabelChange = (checked: boolean) => {
    const previousValue = showLabel;
    setShowLabel(checked);

    startLabelTransition(async () => {
      try {
        const res = await fetch("/api/widget/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showLabel: checked }),
        });

        if (!res.ok) {
          throw new Error("Failed to save");
        }

        toast.success("Label setting saved");
      } catch (error) {
        console.error("[WidgetSection] Failed to update showLabel:", error);
        setShowLabel(previousValue);
        toast.error("Failed to save label setting");
      }
    });
  };

  const siteUrl = appConfig.seo.siteUrl;
  const embedCode = `<script
  src="${siteUrl}/widget.js"
  data-workspace="${workspaceSlug}"
  data-position="${position}"
  async
></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success("Copied to clipboard!");
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("[WidgetSection] Failed to copy to clipboard:", error);
      toast.error("Failed to copy");
    }
  };

  const handleAddOrigin = () => {
    setOriginError(null);

    // Validate input
    const trimmed = newOrigin.trim();
    if (!trimmed) {
      setOriginError("Please enter a URL");
      return;
    }

    // Normalize the origin
    const normalized = normalizeOrigin(trimmed);
    if (!normalized) {
      setOriginError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    // Check for duplicates
    if (allowedOrigins.includes(normalized)) {
      setOriginError("This domain is already added");
      return;
    }

    // Check max limit
    if (allowedOrigins.length >= MAX_ALLOWED_ORIGINS) {
      setOriginError(`Maximum ${MAX_ALLOWED_ORIGINS} domains allowed`);
      return;
    }

    const previousOrigins = allowedOrigins;
    const newOrigins = [...allowedOrigins, normalized];
    setAllowedOrigins(newOrigins); // Optimistic update
    setNewOrigin("");

    startOriginTransition(async () => {
      try {
        const res = await fetch("/api/widget/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allowedOrigins: newOrigins }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save");
        }

        toast.success("Domain added");
      } catch (error) {
        console.error("[WidgetSection] Failed to add origin:", error);
        setAllowedOrigins(previousOrigins); // Revert on error
        toast.error(
          error instanceof Error ? error.message : "Failed to add domain"
        );
      }
    });
  };

  const handleRemoveOrigin = (originToRemove: string) => {
    const previousOrigins = allowedOrigins;
    const newOrigins = allowedOrigins.filter((o) => o !== originToRemove);
    setAllowedOrigins(newOrigins); // Optimistic update

    startOriginTransition(async () => {
      try {
        const res = await fetch("/api/widget/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allowedOrigins: newOrigins }),
        });

        if (!res.ok) {
          throw new Error("Failed to save");
        }

        toast.success("Domain removed");
      } catch (error) {
        console.error("[WidgetSection] Failed to remove origin:", error);
        setAllowedOrigins(previousOrigins); // Revert on error
        toast.error("Failed to remove domain");
      }
    });
  };

  const handleAddRule = () => {
    setRuleError(null);

    const trimmed = newRule.trim();
    if (!trimmed) {
      setRuleError("Please enter a path pattern");
      return;
    }

    if (!trimmed.startsWith("/")) {
      setRuleError("Pattern must start with /");
      return;
    }

    if (pageRules.includes(trimmed)) {
      setRuleError("This pattern is already added");
      return;
    }

    if (pageRules.length >= MAX_PAGE_RULES) {
      setRuleError(`Maximum ${MAX_PAGE_RULES} page rules allowed`);
      return;
    }

    const previousRules = pageRules;
    const updatedRules = [...pageRules, trimmed];
    setPageRules(updatedRules);
    setNewRule("");

    startRuleTransition(async () => {
      try {
        const res = await fetch("/api/widget/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageRules: updatedRules }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save");
        }

        toast.success("Page rule added");
      } catch (error) {
        console.error("[WidgetSection] Failed to add page rule:", error);
        setPageRules(previousRules);
        toast.error(
          error instanceof Error ? error.message : "Failed to add page rule"
        );
      }
    });
  };

  const handleRemoveRule = (ruleToRemove: string) => {
    const previousRules = pageRules;
    const updatedRules = pageRules.filter((r) => r !== ruleToRemove);
    setPageRules(updatedRules);

    startRuleTransition(async () => {
      try {
        const res = await fetch("/api/widget/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageRules: updatedRules }),
        });

        if (!res.ok) {
          throw new Error("Failed to save");
        }

        toast.success("Page rule removed");
      } catch (error) {
        console.error("[WidgetSection] Failed to remove page rule:", error);
        setPageRules(previousRules);
        toast.error("Failed to remove page rule");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          Embed Widget
        </CardTitle>
        <CardDescription>
          Add a feedback widget to your website. Your customers can submit ideas
          and vote without leaving your site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Position selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Button Position</Label>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <RadioGroup
            value={position}
            onValueChange={(v) => handlePositionChange(v as WidgetPosition)}
            className="flex gap-4"
            disabled={isPending}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-left" id="bottom-left" />
              <Label
                htmlFor="bottom-left"
                className="cursor-pointer font-normal"
              >
                Bottom Left
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-right" id="bottom-right" />
              <Label
                htmlFor="bottom-right"
                className="cursor-pointer font-normal"
              >
                Bottom Right
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Show Label toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <Label htmlFor="show-label">Show &quot;Feedback&quot; label</Label>
              {isLabelPending && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <Switch
              id="show-label"
              checked={showLabel}
              onCheckedChange={handleShowLabelChange}
              disabled={isLabelPending}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            When enabled, the widget button expands on hover to show
            &quot;Feedback&quot; text. When disabled, only the icon is shown.
          </p>
        </div>

        {/* Allowed Domains */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <Label>Allowed Domains</Label>
            {isOriginPending && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-muted-foreground text-sm">
            Configure which websites can embed your feedback widget. Your
            app&apos;s domain is always allowed.
          </p>

          {/* Add domain input */}
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={newOrigin}
              onChange={(e) => {
                setNewOrigin(e.target.value);
                setOriginError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddOrigin();
                }
              }}
              disabled={
                isOriginPending || allowedOrigins.length >= MAX_ALLOWED_ORIGINS
              }
              className="flex-1"
            />
            <Button
              onClick={handleAddOrigin}
              disabled={
                isOriginPending || allowedOrigins.length >= MAX_ALLOWED_ORIGINS
              }
              size="sm"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          {originError && (
            <p className="text-destructive text-sm">{originError}</p>
          )}

          {/* Domain list */}
          {allowedOrigins.length > 0 ? (
            <ul className="space-y-2">
              {allowedOrigins.map((origin) => (
                <li
                  key={origin}
                  className="bg-muted flex items-center justify-between rounded-md px-3 py-2"
                >
                  <span className="truncate font-mono text-sm">{origin}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOrigin(origin)}
                    disabled={isOriginPending}
                    className="hover:bg-destructive/10 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove {origin}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground border-muted rounded-md border border-dashed p-4 text-center text-sm">
              No custom domains configured. The widget will only work on your
              app&apos;s domain.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            {allowedOrigins.length}/{MAX_ALLOWED_ORIGINS} domains configured
          </p>
        </div>

        {/* Page Targeting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            <Label>Page Targeting</Label>
            {isRulePending && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-muted-foreground text-sm">
            Specify which pages should show the widget using path patterns. Leave
            empty to show the widget on all pages.
          </p>

          {/* Add rule input */}
          <div className="flex gap-2">
            <Input
              placeholder="/pricing, /docs/**, /blog/*"
              value={newRule}
              onChange={(e) => {
                setNewRule(e.target.value);
                setRuleError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRule();
                }
              }}
              disabled={isRulePending || pageRules.length >= MAX_PAGE_RULES}
              className="flex-1"
            />
            <Button
              onClick={handleAddRule}
              disabled={isRulePending || pageRules.length >= MAX_PAGE_RULES}
              size="sm"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          {ruleError && (
            <p className="text-destructive text-sm">{ruleError}</p>
          )}

          {/* Rules list */}
          {pageRules.length > 0 ? (
            <ul className="space-y-2">
              {pageRules.map((rule) => (
                <li
                  key={rule}
                  className="bg-muted flex items-center justify-between rounded-md px-3 py-2"
                >
                  <span className="truncate font-mono text-sm">{rule}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRule(rule)}
                    disabled={isRulePending}
                    className="hover:bg-destructive/10 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove {rule}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground border-muted rounded-md border border-dashed p-4 text-center text-sm">
              No page rules configured. The widget will show on all pages.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            {pageRules.length}/{MAX_PAGE_RULES} page rules configured
          </p>
        </div>

        {/* Embed code */}
        <div className="space-y-3">
          <Label>Your Embed Code</Label>
          <div className="relative">
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
              <code>{embedCode}</code>
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Paste this code before the closing <code>&lt;/body&gt;</code> tag on
            your website.
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label>Preview</Label>
          <p className="text-muted-foreground text-sm">
            {showLabel
              ? "The button starts as an icon and expands on hover to show \"Feedback\"."
              : "The button shows only the lightbulb icon."}
          </p>
          <div className="bg-muted relative h-40 overflow-hidden rounded-lg border">
            {/* Mock browser content */}
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Your website content
            </div>
            {/* Floating button preview */}
            <div
              className={`group absolute bottom-4 ${
                position === "bottom-right" ? "right-4" : "left-4"
              }`}
            >
              <div className="flex h-11 items-center gap-2 rounded-full bg-zinc-900 px-3 text-sm font-medium text-white shadow-lg transition-all duration-300 group-hover:shadow-xl">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
                {showLabel && (
                  <span className="max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[80px] group-hover:opacity-100">
                    Feedback
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Public board link */}
        <div className="border-t pt-4">
          <p className="text-muted-foreground text-sm">
            Or share your public feedback board directly:{" "}
            <a
              href={`${siteUrl}/b/${workspaceSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {siteUrl}/b/{workspaceSlug}
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

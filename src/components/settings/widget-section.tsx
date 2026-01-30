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
import {
  Check,
  Copy,
  Code2,
  Loader2,
  Plus,
  X,
  Globe,
  Route,
  Type,
  Palette,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
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
  workspaceId: string;
  workspaceSlug: string;
  initialPosition: WidgetPosition;
  initialAllowedOrigins: string[];
  initialPageRules: string[];
  initialShowLabel: boolean;
}

export function WidgetSection({
  workspaceId,
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
  data-workspace="${workspaceId}"
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

    if (trimmed.length > 200) {
      setRuleError("Pattern must be 200 characters or less");
      return;
    }

    const validPattern = /^[a-zA-Z0-9\-._~:@!$&'()+,;=%/\*\?]+$/;
    if (!validPattern.test(trimmed)) {
      setRuleError("Pattern contains invalid characters");
      return;
    }

    if (trimmed.includes("***")) {
      setRuleError("Use * or ** for wildcards, not ***");
      return;
    }

    if (trimmed.includes("//")) {
      setRuleError("Pattern must not contain consecutive slashes");
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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Appearance Card */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Configure how the widget button looks and behaves on your site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Position selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-slate-700">Button Position</Label>
              {isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
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
                  className="cursor-pointer font-normal text-slate-600"
                >
                  Bottom Left
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottom-right" id="bottom-right" />
                <Label
                  htmlFor="bottom-right"
                  className="cursor-pointer font-normal text-slate-600"
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
                <Type className="h-4 w-4 text-slate-500" />
                <Label htmlFor="show-label" className="text-slate-700">
                  Show &quot;Feedback&quot; label
                </Label>
                {isLabelPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
              <Switch
                id="show-label"
                checked={showLabel}
                onCheckedChange={handleShowLabelChange}
                disabled={isLabelPending}
              />
            </div>
            <p className="text-sm text-slate-500">
              When enabled, the widget button expands on hover to show
              &quot;Feedback&quot; text. When disabled, only the icon is shown.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code Card */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Code2 className="h-5 w-5" />
            Embed Code
          </CardTitle>
          <CardDescription>
            Add this code to your website to display the feedback widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-slate-100 p-4 text-sm">
              <code className="text-slate-700">{embedCode}</code>
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
          <p className="text-sm text-slate-500">
            Paste this code before the closing <code>&lt;/body&gt;</code> tag on
            your website.
          </p>

          {/* Public board link */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 text-slate-500" />
              <span className="text-slate-600">Public board:</span>
              <a
                href={`${siteUrl}/b/${workspaceSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
              >
                {siteUrl}/b/{workspaceSlug}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allowed Domains Card */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Globe className="h-5 w-5" />
            Allowed Domains
          </CardTitle>
          <CardDescription>
            Configure which websites can embed your feedback widget. Your
            app&apos;s domain is always allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              className="flex-1 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
            <Button
              onClick={handleAddOrigin}
              disabled={
                isOriginPending || allowedOrigins.length >= MAX_ALLOWED_ORIGINS
              }
              size="sm"
            >
              {isOriginPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Add
            </Button>
          </div>
          {originError && <p className="text-sm text-red-600">{originError}</p>}

          {/* Domain list */}
          {allowedOrigins.length > 0 ? (
            <ul className="space-y-2">
              {allowedOrigins.map((origin) => (
                <li
                  key={origin}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                >
                  <span className="truncate font-mono text-sm text-slate-700">
                    {origin}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOrigin(origin)}
                    disabled={isOriginPending}
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove {origin}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">
                    No domains configured
                  </p>
                  <p className="mt-1 text-amber-700">
                    The widget won&apos;t work on your website until you add your
                    domain. Add your site&apos;s URL above (e.g.,
                    https://yoursite.com).
                  </p>
                </div>
              </div>
            </div>
          )}
          <p className="text-right text-xs text-slate-500">
            {allowedOrigins.length}/{MAX_ALLOWED_ORIGINS} domains configured
          </p>
        </CardContent>
      </Card>

      {/* Page Targeting Card */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Route className="h-5 w-5" />
            Page Targeting
          </CardTitle>
          <CardDescription>
            Specify which pages should show the widget using path patterns.
            Leave empty to show the widget on all pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              className="flex-1 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
            <Button
              onClick={handleAddRule}
              disabled={isRulePending || pageRules.length >= MAX_PAGE_RULES}
              size="sm"
            >
              {isRulePending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Add
            </Button>
          </div>
          {ruleError && <p className="text-sm text-red-600">{ruleError}</p>}

          {/* Rules list */}
          {pageRules.length > 0 ? (
            <ul className="space-y-2">
              {pageRules.map((rule) => (
                <li
                  key={rule}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                >
                  <span className="truncate font-mono text-sm text-slate-700">
                    {rule}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRule(rule)}
                    disabled={isRulePending}
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove {rule}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              No page rules configured. The widget will show on all pages.
            </p>
          )}
          <p className="text-right text-xs text-slate-500">
            {pageRules.length}/{MAX_PAGE_RULES} page rules configured
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

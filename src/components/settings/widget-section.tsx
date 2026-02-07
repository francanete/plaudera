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
  initialPosition: WidgetPosition;
  initialAllowedOrigins: string[];
  initialPageRules: string[];
  initialShowLabel: boolean;
}

export function WidgetSection({
  workspaceId,
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
  const embedCode = `<!-- Plaudera Feedback Widget -->
<script>
  !function(w,d){var p=w.Plaudera=w.Plaudera||function(){
    (p.q=p.q||[]).push(arguments)};p.l=+new Date;
  var s=d.createElement("script");s.async=1;
  s.src="${siteUrl}/widget.js";
  d.head.appendChild(s)}(window,document);
  Plaudera('init', { workspace: '${workspaceId}' });
</script>`;

  const identifyExample = `<!-- Plaudera Feedback Widget -->
<script>
  !function(w,d){var p=w.Plaudera=w.Plaudera||function(){
    (p.q=p.q||[]).push(arguments)};p.l=+new Date;
  var s=d.createElement("script");s.async=1;
  s.src="${siteUrl}/widget.js";
  d.head.appendChild(s)}(window,document);
  Plaudera('init', {
    workspace: '${workspaceId}',
    user: {
      email: user.email,  // required
      name: user.name     // optional
    }
  });
</script>`;

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
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Appearance Card */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 sm:text-lg">
            <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
            Appearance
          </CardTitle>
          <CardDescription className="text-sm">
            Configure how the widget button looks and behaves on your site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-4 pb-4 sm:space-y-6 sm:px-6 sm:pb-6">
          {/* Position selector */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-700 sm:text-base">
                Button Position
              </Label>
              {isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>
            <RadioGroup
              value={position}
              onValueChange={(v) => handlePositionChange(v as WidgetPosition)}
              className="flex flex-col gap-2 sm:flex-row sm:gap-4"
              disabled={isPending}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottom-left" id="bottom-left" />
                <Label
                  htmlFor="bottom-left"
                  className="cursor-pointer text-sm font-normal text-slate-600"
                >
                  Bottom Left
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottom-right" id="bottom-right" />
                <Label
                  htmlFor="bottom-right"
                  className="cursor-pointer text-sm font-normal text-slate-600"
                >
                  Bottom Right
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Show Label toggle */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Type className="h-4 w-4 flex-shrink-0 text-slate-500" />
                <Label
                  htmlFor="show-label"
                  className="text-sm text-slate-700 sm:text-base"
                >
                  Show &quot;Feedback&quot; label
                </Label>
                {isLabelPending && (
                  <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />
                )}
              </div>
              <Switch
                id="show-label"
                checked={showLabel}
                onCheckedChange={handleShowLabelChange}
                disabled={isLabelPending}
                className="flex-shrink-0"
              />
            </div>
            <p className="text-xs text-slate-500 sm:text-sm">
              When enabled, the widget button expands on hover to show
              &quot;Feedback&quot; text. When disabled, only the icon is shown.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code Card */}
      <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 sm:text-lg">
            <Code2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Embed Code
          </CardTitle>
          <CardDescription className="text-sm">
            Add this code to your website to display the feedback widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
          <div className="relative min-w-0">
            <pre className="max-w-full overflow-x-auto rounded-lg bg-slate-100 p-3 pr-16 text-xs sm:p-4 sm:pr-20 sm:text-sm">
              <code className="block whitespace-pre text-slate-700">
                {embedCode}
              </code>
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="xs:inline hidden">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="xs:inline hidden">Copy</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">
            Paste this code before the closing <code>&lt;/body&gt;</code> tag on
            your website.
          </p>

          {/* Identify Users guide */}
          <details className="group rounded-lg border border-slate-200 bg-slate-50/50">
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 sm:px-4 sm:py-3 sm:text-sm">
              Optional: Auto-identify logged-in users
            </summary>
            <div className="space-y-4 border-t border-slate-200 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                If your website has its own login system, you can tell the
                widget who the user is. They&apos;ll skip the email verification
                step and can submit feedback immediately.
              </p>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                    1
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                    <span className="font-medium text-slate-700">
                      Add your domain
                    </span>{" "}
                    to the Allowed Domains list below (e.g.,{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                      https://yoursite.com
                    </code>
                    ). This is required for security — only allowed domains can
                    identify users.
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                    2
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                    <span className="font-medium text-slate-700">
                      Add the{" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                        user
                      </code>{" "}
                      option
                    </span>{" "}
                    to your init call — replace{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                      user.email
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                      user.name
                    </code>{" "}
                    with your own logged-in user variables:
                  </p>
                </div>
              </div>

              <pre className="max-w-full overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs sm:p-4 sm:text-sm">
                <code className="block whitespace-pre text-slate-700">
                  {identifyExample}
                </code>
              </pre>

              <div className="flex gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                  3
                </span>
                <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                  <span className="font-medium text-slate-700">
                    That&apos;s it!
                  </span>{" "}
                  Identified users will see the feedback form right away. If a
                  visitor isn&apos;t logged in, just don&apos;t include the{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                    user
                  </code>{" "}
                  option — they&apos;ll verify their email the normal way.
                </p>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Allowed Domains Card */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 sm:text-lg">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
            Allowed Domains
          </CardTitle>
          <CardDescription className="text-sm">
            Configure which websites can embed your feedback widget. Your
            app&apos;s domain is always allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
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
              className="min-w-0 flex-1 border-slate-200 text-sm focus:border-indigo-300 focus:ring-indigo-200"
            />
            <Button
              onClick={handleAddOrigin}
              disabled={
                isOriginPending || allowedOrigins.length >= MAX_ALLOWED_ORIGINS
              }
              size="sm"
              className="flex-shrink-0"
            >
              {isOriginPending ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
              ) : (
                <Plus className="h-4 w-4 sm:mr-1" />
              )}
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {originError && (
            <p className="text-xs text-red-600 sm:text-sm">{originError}</p>
          )}

          {/* Domain list */}
          {allowedOrigins.length > 0 ? (
            <ul className="space-y-2">
              {allowedOrigins.map((origin) => (
                <li
                  key={origin}
                  className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 sm:px-3 sm:py-2"
                >
                  <span className="min-w-0 truncate font-mono text-xs text-slate-700 sm:text-sm">
                    {origin}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOrigin(origin)}
                    disabled={isOriginPending}
                    className="h-6 w-6 flex-shrink-0 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove {origin}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 sm:h-5 sm:w-5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-medium text-amber-800">
                    No domains configured
                  </p>
                  <p className="mt-1 text-amber-700">
                    The widget won&apos;t work on your website until you add
                    your domain. Add your site&apos;s URL above (e.g.,
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
        <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 sm:text-lg">
            <Route className="h-4 w-4 sm:h-5 sm:w-5" />
            Page Targeting
          </CardTitle>
          <CardDescription className="text-sm">
            Specify which pages should show the widget using path patterns.
            Leave empty to show on all pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
          {/* Add rule input */}
          <div className="flex gap-2">
            <Input
              placeholder="/pricing, /docs/**"
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
              className="min-w-0 flex-1 border-slate-200 text-sm focus:border-indigo-300 focus:ring-indigo-200"
            />
            <Button
              onClick={handleAddRule}
              disabled={isRulePending || pageRules.length >= MAX_PAGE_RULES}
              size="sm"
              className="flex-shrink-0"
            >
              {isRulePending ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
              ) : (
                <Plus className="h-4 w-4 sm:mr-1" />
              )}
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          {ruleError && (
            <p className="text-xs text-red-600 sm:text-sm">{ruleError}</p>
          )}

          {/* Rules list */}
          {pageRules.length > 0 ? (
            <ul className="space-y-2">
              {pageRules.map((rule) => (
                <li
                  key={rule}
                  className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 sm:px-3 sm:py-2"
                >
                  <span className="min-w-0 truncate font-mono text-xs text-slate-700 sm:text-sm">
                    {rule}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRule(rule)}
                    disabled={isRulePending}
                    className="h-6 w-6 flex-shrink-0 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove {rule}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500 sm:p-4 sm:text-sm">
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

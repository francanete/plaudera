"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";
import { appConfig } from "@/lib/config";

interface WidgetSectionProps {
  workspaceSlug: string;
}

type Position = "bottom-right" | "bottom-left";

export function WidgetSection({ workspaceSlug }: WidgetSectionProps) {
  const [position, setPosition] = useState<Position>("bottom-right");
  const [copied, setCopied] = useState(false);

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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
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
          <Label>Button Position</Label>
          <RadioGroup
            value={position}
            onValueChange={(v) => setPosition(v as Position)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-right" id="bottom-right" />
              <Label
                htmlFor="bottom-right"
                className="cursor-pointer font-normal"
              >
                Bottom Right
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-left" id="bottom-left" />
              <Label
                htmlFor="bottom-left"
                className="cursor-pointer font-normal"
              >
                Bottom Left
              </Label>
            </div>
          </RadioGroup>
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
          <div className="bg-muted relative h-40 overflow-hidden rounded-lg border">
            {/* Mock browser content */}
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Your website content
            </div>
            {/* Floating button preview */}
            <div
              className={`absolute bottom-4 ${
                position === "bottom-right" ? "right-4" : "left-4"
              }`}
            >
              <div className="bg-primary text-primary-foreground flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
                <span>💡</span>
                <span>Feedback</span>
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

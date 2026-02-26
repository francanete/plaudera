"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    type: "cant_do" as const,
    question: "What can't you do today that you wish you could?",
    label: "Can't do",
    description: "Discover unmet needs",
  },
  {
    type: "most_annoying" as const,
    question: "What's your biggest frustration right now?",
    label: "Biggest frustration",
    description: "Find pain points",
  },
  {
    type: "custom" as const,
    question: "",
    label: "Custom question",
    description: "Write your own",
  },
];

export function CreatePollForm() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [maxResponses, setMaxResponses] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTemplateSelect = (templateType: string) => {
    setSelectedTemplate(templateType);
    const template = TEMPLATES.find((t) => t.type === templateType);
    if (template && template.type !== "custom") {
      setQuestion(template.question);
    } else {
      setQuestion("");
    }
  };

  const handleSubmit = async (status: "draft" | "active") => {
    if (!question.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          templateType: selectedTemplate || "custom",
          status,
          maxResponses: maxResponses ? parseInt(maxResponses, 10) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create poll");
      }

      toast.success(
        status === "active"
          ? "Poll created and activated!"
          : "Poll saved as draft"
      );
      router.push("/dashboard/ideas/polls");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create poll"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      {/* Template picker */}
      <div className="space-y-3">
        <Label>Choose a template</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((template) => (
            <button
              key={template.type}
              onClick={() => handleTemplateSelect(template.type)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                selectedTemplate === template.type
                  ? "border-primary bg-primary/5"
                  : "hover:bg-accent/50"
              )}
            >
              <p className="text-sm font-medium">{template.label}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <Label htmlFor="question">Question *</Label>
        <Input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to ask?"
          maxLength={500}
        />
      </div>

      {/* Max responses */}
      <div className="space-y-2">
        <Label htmlFor="maxResponses">
          Max responses{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="maxResponses"
          type="number"
          value={maxResponses}
          onChange={(e) => setMaxResponses(e.target.value)}
          placeholder="Auto-close after N responses"
          min={1}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => handleSubmit("draft")}
          disabled={isSubmitting || !question.trim()}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Save as draft
        </Button>
        <Button
          onClick={() => handleSubmit("active")}
          disabled={isSubmitting || !question.trim()}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Activate now
        </Button>
      </div>
    </div>
  );
}

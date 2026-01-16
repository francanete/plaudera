"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronUp,
  Trash2,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Search,
  AlertCircle,
} from "lucide-react";
import type { Idea, IdeaStatus } from "@/lib/db/schema";

interface IdeaDetailProps {
  idea: Idea;
}

const statusConfig: Record<
  IdeaStatus,
  {
    label: string;
    icon: typeof Clock;
  }
> = {
  PENDING: { label: "Pending Review", icon: AlertCircle },
  NEW: { label: "New", icon: Lightbulb },
  UNDER_REVIEW: { label: "Under Review", icon: Search },
  PLANNED: { label: "Planned", icon: Clock },
  IN_PROGRESS: { label: "In Progress", icon: PlayCircle },
  DONE: { label: "Done", icon: CheckCircle },
  DECLINED: { label: "Declined", icon: XCircle },
};

const statusOptions: IdeaStatus[] = [
  "PENDING",
  "NEW",
  "UNDER_REVIEW",
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "DECLINED",
];

export function IdeaDetail({ idea: initialIdea }: IdeaDetailProps) {
  const router = useRouter();
  const [idea, setIdea] = useState(initialIdea);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track if description has changed
  const descriptionChanged = description !== (idea.description || "");

  const handleTitleBlur = async () => {
    if (title === idea.title || !title.trim()) {
      setTitle(idea.title); // Reset if empty
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

      setIdea({ ...idea, title: title.trim() });
      toast.success("Title updated");
    } catch {
      setTitle(idea.title); // Reset on error
      toast.error("Failed to update title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description || null }),
      });

      if (!res.ok) throw new Error();

      setIdea({ ...idea, description: description || null });
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleStatusChange = async (newStatus: IdeaStatus) => {
    const previousStatus = idea.status;
    setIdea({ ...idea, status: newStatus });

    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error();

      toast.success("Status updated");
    } catch {
      setIdea({ ...idea, status: previousStatus });
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this idea? This cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Idea deleted");
      router.push("/dashboard/ideas");
    } catch {
      toast.error("Failed to delete idea");
      setIsDeleting(false);
    }
  };

  const StatusIcon = statusConfig[idea.status].icon;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/dashboard/ideas"
        className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Ideas
      </Link>

      {/* Main content */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          {/* Editable title */}
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              disabled={isSavingTitle}
              className="hover:border-input focus:border-input border-transparent bg-transparent text-2xl font-bold"
              placeholder="Idea title"
            />
          </div>

          {/* Vote count */}
          <div className="bg-muted/50 flex flex-col items-center rounded-lg px-4 py-2">
            <ChevronUp className="text-muted-foreground h-5 w-5" />
            <span className="text-2xl font-bold">{idea.voteCount}</span>
            <span className="text-muted-foreground text-xs">votes</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Editable description */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm font-medium">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="resize-none"
            />
            {descriptionChanged && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveDescription}
                  disabled={isSavingDescription}
                >
                  {isSavingDescription ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Status */}
          <div className="flex items-center gap-4">
            <label className="text-muted-foreground text-sm font-medium">
              Status
            </label>
            <Select value={idea.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <StatusIcon className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => {
                  const cfg = statusConfig[opt];
                  const Icon = cfg.icon;
                  return (
                    <SelectItem key={opt} value={opt}>
                      <div className="flex items-center">
                        <Icon className="mr-2 h-4 w-4" />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <hr className="border-border" />

          {/* Metadata */}
          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              <span className="font-medium">Submitted:</span>{" "}
              {new Date(idea.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {idea.authorEmail && (
              <p>
                <span className="font-medium">By:</span> {idea.authorEmail}
              </p>
            )}
          </div>

          <hr className="border-border" />

          {/* Delete */}
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Idea"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

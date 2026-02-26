"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import Link from "next/link";

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

interface IdeaTagPickerProps {
  ideaId: string;
  assignedTags: TagInfo[];
  workspaceTags: TagInfo[];
}

export function IdeaTagPicker({
  ideaId,
  assignedTags: initialAssigned,
  workspaceTags,
}: IdeaTagPickerProps) {
  const [assignedTags, setAssignedTags] = useState(initialAssigned);
  const [open, setOpen] = useState(false);

  const availableTags = workspaceTags.filter(
    (wt) => !assignedTags.some((at) => at.id === wt.id)
  );

  const handleAdd = async (tag: TagInfo) => {
    setAssignedTags((prev) => [...prev, tag]);
    setOpen(false);

    try {
      const res = await fetch(`/api/ideas/${ideaId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Tag "${tag.name}" added`);
    } catch {
      setAssignedTags((prev) => prev.filter((t) => t.id !== tag.id));
      toast.error("Failed to add tag");
    }
  };

  const handleRemove = async (tag: TagInfo) => {
    setAssignedTags((prev) => prev.filter((t) => t.id !== tag.id));

    try {
      const res = await fetch(`/api/ideas/${ideaId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Tag "${tag.name}" removed`);
    } catch {
      setAssignedTags((prev) => [...prev, tag]);
      toast.error("Failed to remove tag");
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Tags</h3>
      <div className="flex flex-wrap items-center gap-2">
        {assignedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
            <button
              onClick={() => handleRemove(tag)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {workspaceTags.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No workspace tags yet.{" "}
            <Link
              href="/dashboard/board/tags"
              className="text-indigo-600 underline hover:text-indigo-500"
            >
              Create tags
            </Link>
          </p>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Plus className="h-3 w-3" />
                Add tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => handleAdd(tag)}
                      >
                        <span
                          className="mr-2 h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  "#6B7280",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
];

export function TagManager({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: selectedColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create tag");
      }
      const { tag } = await res.json();
      setTags((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewTagName("");
      toast.success("Tag created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create tag"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    const previous = tags;
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Tag deleted");
    } catch {
      setTags(previous);
      toast.error("Failed to delete tag");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium">Tag name</label>
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="e.g., Enterprise, Mobile, Integration"
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-1">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                className={`h-8 w-8 rounded-md border-2 transition-all ${
                  selectedColor === color
                    ? "border-foreground scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>
        <Button
          onClick={handleCreate}
          disabled={isCreating || !newTagName.trim()}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No tags yet. Create your first tag above.
        </p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm font-medium">{tag.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(tag.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

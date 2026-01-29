"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IdeaDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaTitle: string;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function IdeaDeleteDialog({
  open,
  onOpenChange,
  ideaTitle,
  onConfirm,
  isDeleting,
}: IdeaDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Idea</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{ideaTitle}&rdquo;? This
            action cannot be undone and will remove all associated votes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

interface MoveToRoadmapConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isMoving: boolean;
}

export function MoveToRoadmapConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isMoving,
}: MoveToRoadmapConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Roadmap</DialogTitle>
          <DialogDescription>
            This action cannot be reverted. Once on the roadmap, this idea
            cannot be moved back to Ideas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isMoving}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {isMoving ? "Moving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

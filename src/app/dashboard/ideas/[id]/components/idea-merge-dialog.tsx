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

interface IdeaMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTitle: string;
  targetTitle: string;
  onConfirm: () => void;
  isMerging: boolean;
}

export function IdeaMergeDialog({
  open,
  onOpenChange,
  sourceTitle,
  targetTitle,
  onConfirm,
  isMerging,
}: IdeaMergeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Idea</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-slate-500">
              <p>
                Are you sure you want to merge &ldquo;{sourceTitle}&rdquo; into
                &ldquo;{targetTitle}&rdquo;?
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>All votes will be transferred to the parent idea</li>
                <li>This idea will be hidden from the public board</li>
                <li>There is no way to undo this operation</li>
              </ul>
              <p className="mt-2 font-medium text-slate-700">
                This action cannot be reverted.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMerging}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isMerging}>
            {isMerging ? "Merging..." : "Confirm Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

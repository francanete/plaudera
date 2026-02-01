"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { workspaceBrandingSchema } from "@/lib/workspace-validation";
import { updateWorkspaceBrandingAction } from "@/app/dashboard/board/actions";

interface WorkspaceBrandingFormProps {
  currentName: string;
  currentDescription: string | null;
}

export function WorkspaceBrandingForm({
  currentName,
  currentDescription,
}: WorkspaceBrandingFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(workspaceBrandingSchema),
    defaultValues: {
      name: currentName,
      description: currentDescription || "",
    },
  });

  const onSubmit = (data: { name: string; description?: string | null }) => {
    startTransition(async () => {
      const result = await updateWorkspaceBrandingAction(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Branding updated!");
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-slate-700">
          Workspace Name
        </Label>
        <Input
          id="name"
          {...form.register("name")}
          maxLength={40}
          className="border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
        />
        <div className="flex justify-end">
          <p className="text-xs text-slate-400">
            {form.watch("name").length}/40 characters
          </p>
        </div>
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-slate-700">
          Description (optional)
        </Label>
        <Textarea
          id="description"
          {...form.register("description")}
          maxLength={150}
          rows={3}
          placeholder="A brief description of your feedback board..."
          className="min-h-[100px] resize-none border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
        />
        <div className="flex justify-end">
          <p className="text-xs text-slate-400">
            {(form.watch("description") || "").length}/150 characters
          </p>
        </div>
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
}

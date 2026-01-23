"use client";

import { useTransition, useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { updateWorkspaceSlug } from "@/app/dashboard/settings/actions";
import { slugSchema } from "@/lib/slug-validation";

const formSchema = z.object({
  slug: slugSchema,
});

type FormValues = z.infer<typeof formSchema>;

interface WorkspaceSlugFormProps {
  currentSlug: string;
  changesUsed: number;
}

type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "error";

export function WorkspaceSlugForm({
  currentSlug,
  changesUsed,
}: WorkspaceSlugFormProps) {
  const [isPending, startTransition] = useTransition();
  const [availability, setAvailability] = useState<AvailabilityStatus>("idle");
  const [availabilityError, setAvailabilityError] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { slug: currentSlug },
  });

  const watchedSlug = form.watch("slug");

  const checkAvailability = useCallback(
    (slug: string) => {
      // Clear any pending check
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Same as current = available (no-op)
      if (slug === currentSlug) {
        setAvailability("idle");
        setAvailabilityError("");
        return;
      }

      // Validate format first
      const parsed = slugSchema.safeParse(slug);
      if (!parsed.success) {
        setAvailability("error");
        setAvailabilityError(parsed.error.issues[0].message);
        return;
      }

      setAvailability("checking");

      debounceRef.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `/api/workspace/slug/check?slug=${encodeURIComponent(slug)}`
          );
          const data = await response.json();

          if (data.available) {
            setAvailability("available");
            setAvailabilityError("");
          } else {
            setAvailability("taken");
            setAvailabilityError(data.error || "This slug is already taken");
          }
        } catch {
          setAvailability("error");
          setAvailabilityError("Failed to check availability");
        }
      }, 300);
    },
    [currentSlug]
  );

  useEffect(() => {
    if (watchedSlug && watchedSlug !== currentSlug) {
      checkAvailability(watchedSlug);
    } else {
      setAvailability("idle");
      setAvailabilityError("");
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [watchedSlug, currentSlug, checkAvailability]);

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("slug", data.slug);

      const result = await updateWorkspaceSlug(formData);

      if (result.error) {
        form.setError("root", { message: result.error });
      } else {
        form.reset({ slug: result.slug });
        setAvailability("idle");
      }
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const maxChanges = 10;
  const remainingChanges = maxChanges - changesUsed;
  const isUnchanged = watchedSlug === currentSlug;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Public Board URL</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <div className="relative flex-1">
                    <Input
                      placeholder="my-brand"
                      {...field}
                      className="pr-10"
                    />
                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                      {availability === "checking" && (
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                      )}
                      {availability === "available" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {(availability === "taken" ||
                        availability === "error") && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </FormControl>
              </div>
              <FormDescription>
                {appUrl}/b/{watchedSlug || "your-slug"}
              </FormDescription>
              {availabilityError && availability !== "idle" && (
                <p className="text-destructive text-sm">{availabilityError}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-muted-foreground text-xs">
          {remainingChanges} of {maxChanges} slug changes remaining. Your
          previous slug will continue working as a redirect.
        </p>

        {form.formState.errors.root && (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={
            isPending ||
            isUnchanged ||
            availability === "taken" ||
            availability === "checking"
          }
        >
          {isPending ? "Updating..." : "Update slug"}
        </Button>
      </form>
    </Form>
  );
}

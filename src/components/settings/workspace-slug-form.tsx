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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { updateWorkspaceSlug } from "@/app/dashboard/board/actions";
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

  const previewUrl = `${appUrl}/b/${watchedSlug || "your-slug"}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700">Board Slug</FormLabel>
              <FormControl>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Globe className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    placeholder="my-brand"
                    {...field}
                    className="border-slate-200 pr-10 pl-9 focus:border-indigo-300 focus:ring-indigo-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {availability === "checking" && (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    )}
                    {availability === "available" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {(availability === "taken" || availability === "error") && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </FormControl>

              {/* Styled URL Preview Box */}
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 transition-colors hover:border-slate-200 hover:bg-slate-100 sm:px-3"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600 sm:text-sm">
                  {previewUrl}
                </span>
                <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
              </a>

              {availabilityError && availability !== "idle" && (
                <p className="mt-2 text-sm text-red-500">{availabilityError}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Blue-tinted Info Callout */}
        <div className="rounded-lg border border-blue-100/50 bg-blue-50/50 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-400 sm:mt-0.5" />
            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              <span className="font-medium text-slate-700">
                {remainingChanges} of {maxChanges}
              </span>{" "}
              slug changes remaining. Changing your slug will update your public
              board URL. Widget embeds are not affected.
            </p>
          </div>
        </div>

        {form.formState.errors.root && (
          <p className="text-sm text-red-500">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          variant="secondary"
          disabled={
            isPending ||
            isUnchanged ||
            availability === "taken" ||
            availability === "checking"
          }
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          {isPending ? "Updating..." : "Update slug"}
        </Button>
      </form>
    </Form>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function DuplicatesLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="mt-1 ml-[3.25rem]">
          <Skeleton className="h-6 w-96" />
        </div>
      </div>

      {/* Duplicate cards */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            {/* Comparison area */}
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    {/* Label and votes */}
                    <div className="mb-3 flex items-center justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-12 rounded-md" />
                    </div>
                    {/* Title */}
                    <Skeleton className="mb-2 h-5 w-3/4" />
                    {/* Description */}
                    <Skeleton className="mb-3 h-4 w-full" />
                    {/* Date */}
                    <Skeleton className="mb-4 h-3 w-28" />
                    {/* Button */}
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <Skeleton className="h-10 w-36 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

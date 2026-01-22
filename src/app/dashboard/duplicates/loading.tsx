import { Skeleton } from "@/components/ui/skeleton";

export default function DuplicatesLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Duplicate cards */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-6">
            {/* Card header */}
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            {/* Side-by-side cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((j) => (
                <div key={j} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="mb-3 h-4 w-full" />
                  <Skeleton className="mb-3 h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>

            {/* Dismiss button */}
            <div className="mt-4 flex justify-center">
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function IdeaDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back navigation skeleton */}
      <Skeleton className="h-5 w-32" />

      {/* Main content skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          {/* Title skeleton */}
          <Skeleton className="h-10 flex-1" />

          {/* Vote count skeleton */}
          <div className="bg-muted/50 flex flex-col items-center rounded-lg px-4 py-2">
            <Skeleton className="mb-1 h-5 w-5" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="mt-1 h-3 w-10" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>

          <hr className="border-border" />

          {/* Status skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-[180px]" />
          </div>

          <hr className="border-border" />

          {/* Metadata skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>

          <hr className="border-border" />

          {/* Delete button skeleton */}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

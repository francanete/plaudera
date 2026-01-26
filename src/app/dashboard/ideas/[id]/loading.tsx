import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function IdeaDetailLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton: Back button + Title */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-2/3" />
      </div>

      {/* Main card skeleton */}
      <Card className="border-slate-200/60 shadow-sm">
        <div className="space-y-8 p-6">
          {/* Vote box row */}
          <div className="flex items-start gap-6">
            <div className="flex-1" />
            {/* Vote box skeleton */}
            <div className="flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>

          {/* Description skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-[160px] w-full" />
          </div>

          <Separator className="bg-slate-100" />

          {/* Status skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-[200px]" />
          </div>

          <Separator className="bg-slate-100" />

          {/* Meta skeleton */}
          <div className="flex items-start justify-between">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </Card>
    </div>
  );
}

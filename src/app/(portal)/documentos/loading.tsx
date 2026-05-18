import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex gap-3 p-4 border-b border-gray-100">
          <Skeleton className="h-8 w-full max-w-xs" />
          <Skeleton className="h-8 w-32" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0">
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

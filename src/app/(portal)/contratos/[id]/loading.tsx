import { Skeleton } from "@/components/ui/skeleton";

export default function ContratoDetailLoading() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 lg:col-span-2">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <Skeleton className="h-5 w-44" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

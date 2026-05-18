import { Skeleton } from "@/components/ui/skeleton";

export default function AuditoriaLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-48 flex-1" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-48 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

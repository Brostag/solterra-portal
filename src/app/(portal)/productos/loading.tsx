import { Skeleton } from "@/components/ui/skeleton";

export default function ProductosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex gap-4 px-5 py-3 border-b bg-gray-50">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b last:border-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

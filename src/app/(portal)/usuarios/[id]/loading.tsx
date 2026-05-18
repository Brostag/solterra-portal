import { Skeleton } from "@/components/ui/skeleton";

export default function UsuarioDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 pt-4">
            <div className="border-t border-gray-100 pt-4">
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

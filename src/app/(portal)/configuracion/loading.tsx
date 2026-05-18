import { Skeleton } from "@/components/ui/skeleton";

export default function ConfiguracionLoading() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {[1, 2, 3].map((section) => (
        <div key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 gap-5">
            {Array.from({ length: section === 3 ? 2 : 4 }).map((_, i) => (
              <div key={i} className={i === 0 && section !== 3 ? "col-span-2 space-y-2" : "space-y-2"}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-9 w-44" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-4 w-96 max-w-full bg-gray-100 rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-72" />
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-80" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-96" />
      </div>
    </div>
  );
}

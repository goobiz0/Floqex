export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
      {/* Header Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface" />
          <div className="h-6 w-32 rounded bg-surface" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 rounded-full bg-surface hidden sm:block" />
          <div className="h-10 w-28 rounded-full bg-surface" />
        </div>
      </div>

      {/* Hero Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[220px] w-full rounded-[32px] bg-surface" />
        ))}
      </div>

      {/* Middle Split */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Recent Operations */}
        <div className="h-[400px] rounded-[32px] border border-line bg-base p-6 lg:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-8 w-48 rounded-full bg-surface" />
            <div className="h-8 w-8 rounded-full bg-surface" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-[12px] bg-surface" />
                  <div className="h-4 w-24 rounded bg-surface" />
                </div>
                <div className="h-6 w-16 rounded-full bg-surface" />
              </div>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-[400px] rounded-[32px] border border-line bg-base p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 rounded-full bg-surface" />
            <div className="h-8 w-8 rounded-full bg-surface" />
          </div>
          <div className="mt-8 flex flex-1 items-center justify-center">
            <div className="h-48 w-48 rounded-full bg-surface/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

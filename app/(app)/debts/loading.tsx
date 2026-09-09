export default function DebtsLoading() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-card" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-card" />
      </div>
      <div className="mb-4 rounded-card border border-divider bg-card p-5 shadow-sm">
        <div className="h-5 w-56 animate-pulse rounded bg-surface" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-card border border-divider bg-surface p-5 shadow-md"
          >
            <div className="h-5 w-32 animate-pulse rounded bg-card" />
            <div className="mt-3 grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-8 animate-pulse rounded bg-card" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

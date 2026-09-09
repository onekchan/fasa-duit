export default function FundsLoading() {
  return (
    <div>
      <div className="mb-4 h-9 w-40 animate-pulse rounded-lg bg-card" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-card border border-divider bg-surface p-5 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-lg bg-card" />
              <div className="flex-1">
                <div className="h-5 w-32 animate-pulse rounded bg-card" />
                <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-card" />
              </div>
            </div>
            <div className="my-4 h-2 animate-pulse rounded-pill bg-divider" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-8 animate-pulse rounded bg-card" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

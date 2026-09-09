/**
 * Transactions-specific loading skeleton — title bar + toolbar shape + a
 * handful of row placeholders. Warm-toned animate-pulse.
 */
export default function TransactionsLoading() {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-card" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-card" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-card" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-card" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-card" />
      </div>
      <div className="rounded-card border border-divider bg-surface">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-t border-divider px-4 py-3 first:border-t-0"
          >
            <div className="h-4 w-32 animate-pulse rounded bg-card" style={{ animationDelay: `${i * 60}ms` }} />
            <div className="h-4 w-24 animate-pulse rounded bg-card" style={{ animationDelay: `${i * 60}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

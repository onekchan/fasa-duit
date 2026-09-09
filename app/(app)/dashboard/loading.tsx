import { Spinner } from "@/components/ui/Spinner";

/**
 * Dashboard-specific loading skeleton. Shape-matches the real dashboard so
 * users perceive faster loads via visual continuity.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-lg bg-card" />
      <div className="rounded-card border border-divider bg-surface p-6 shadow-md">
        <SkelBar />
        <SkelBar delay={80} />
        <SkelBar delay={160} />
        <div className="mt-4 h-4 w-24 animate-pulse rounded bg-card" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex h-72 items-center justify-center rounded-card border border-divider bg-surface shadow-md">
          <Spinner size={22} className="text-brand" />
        </div>
        <div className="rounded-card border border-divider bg-card p-6">
          <div className="h-6 w-32 animate-pulse rounded bg-surface" />
          <div className="mt-3 flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-surface" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkelBar({ delay = 0 }: { delay?: number }) {
  return (
    <div className="my-3">
      <div
        className="mb-1.5 h-3 w-24 animate-pulse rounded bg-card"
        style={{ animationDelay: `${delay}ms` }}
      />
      <div className="h-2 animate-pulse rounded-pill bg-divider" style={{ animationDelay: `${delay}ms` }} />
    </div>
  );
}

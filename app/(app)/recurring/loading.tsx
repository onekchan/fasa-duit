import { Card } from "@/components/ui/card";

/** Route-level skeleton. Matches the /recurring layout so the page swap feels weightless. */
export default function Loading() {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <div className="h-9 w-40 animate-pulse rounded bg-divider/60" />
        <div className="h-9 w-28 animate-pulse rounded bg-divider/60" />
      </div>
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="mb-2 h-4 w-1/3 rounded bg-divider/60" />
            <div className="h-3 w-1/2 rounded bg-divider/40" />
          </Card>
        ))}
      </div>
    </div>
  );
}

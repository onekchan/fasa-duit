import { Spinner } from "@/components/ui/Spinner";

/**
 * Route-level loading UI for every authenticated page. Next.js shows this
 * automatically during navigation while the destination's SSR data loads.
 * Kept minimal — a small spinner + brand hint, warm token colors, respects
 * the sidebar/tab-bar shell so the fixed nav doesn't move.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-muted">
        <Spinner size={20} className="text-brand" />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}

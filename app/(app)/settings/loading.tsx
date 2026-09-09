import { Spinner } from "@/components/ui/Spinner";

export default function SettingsLoading() {
  return (
    <div>
      <div className="mb-6 h-9 w-32 animate-pulse rounded-lg bg-card" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-card border border-divider bg-surface p-6 shadow-md"
          >
            <div className="mb-3 h-6 w-40 animate-pulse rounded bg-card" style={{ animationDelay: `${i * 80}ms` }} />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-card" style={{ animationDelay: `${i * 80}ms` }} />
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Spinner size={18} className="text-brand" />
      </div>
    </div>
  );
}

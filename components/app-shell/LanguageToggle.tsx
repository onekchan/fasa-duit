"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";
import { setLanguage } from "@/app/actions/lang";

/**
 * Compact EN / BM segmented pill for the top bar. Lives in both the public
 * landing top nav and the authenticated app header.
 *
 * Behavior:
 *   * Clicking a segment that's already active is a no-op (feels snappier
 *     than firing an unchanged mutation).
 *   * Otherwise calls `setLanguage` (Server Action) which sets the `lang`
 *     cookie AND, if signed in, updates `profiles.language`. Then the whole
 *     RSC tree revalidates and re-renders in the new language.
 *   * `useTransition` gives us `isPending` so the pill can dim its opacity
 *     during the round trip — no full-page spinner needed.
 *
 * `variant`:
 *   * `"full"` (default) — shows the globe icon + `EN` / `BM` labels.
 *   * `"compact"` — icon hidden, only the two two-letter labels; used in
 *     the mobile top bar where every pixel counts.
 */
export function LanguageToggle({
  current,
  variant = "full",
  className,
}: {
  current: Language;
  variant?: "full" | "compact";
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const set = (next: Language) => {
    if (next === current || isPending) return;
    startTransition(() => setLanguage(next));
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-divider bg-card p-0.5 text-xs font-semibold text-muted transition-opacity",
        isPending && "opacity-60",
        className,
      )}
      aria-label="Language"
      role="group"
    >
      {variant === "full" && (
        <Languages className="ml-1.5 h-3.5 w-3.5 text-muted" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => set("en")}
        disabled={isPending}
        aria-pressed={current === "en"}
        className={cn(
          "rounded-md px-2 py-1 transition-colors",
          current === "en"
            ? "bg-surface text-ink shadow-sm"
            : "hover:bg-surface/60 hover:text-ink",
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => set("ms")}
        disabled={isPending}
        aria-pressed={current === "ms"}
        className={cn(
          "rounded-md px-2 py-1 transition-colors",
          current === "ms"
            ? "bg-surface text-ink shadow-sm"
            : "hover:bg-surface/60 hover:text-ink",
        )}
      >
        BM
      </button>
    </div>
  );
}

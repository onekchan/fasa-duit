"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Non-intrusive ad slot. Renders one of three states based on env + user tier:
 *
 *   1. **Premium bypass** — subscribed users never see it (returns null so the
 *      third-party script never even loads → the app is measurably faster for
 *      paying users, which is a hidden bonus of the tier).
 *   2. **Placeholder** — when `NEXT_PUBLIC_ADS_ENABLED` is not "1" (default in
 *      dev + preview), we render a subtle warm-tinted outline card that says
 *      "Ad space (beta)". Lets us design and audit the layout without loading
 *      any tracker, and never scares a beta tester.
 *   3. **Live** — when `NEXT_PUBLIC_ADS_ENABLED === "1"` and the site is on
 *      production, we inject the EthicalAds `<div>` slot; their script (which
 *      the root layout only loads under the same env gate) will fill it.
 *
 * Placement rules (enforced by callers, documented in plan.md):
 *   * Never above-the-fold on mobile.
 *   * Never inside the auth flow, wizard, or any money-input row.
 *   * Never modal, interstitial, or auto-playing.
 *   * Static banner only. One per screen. Aspect ratio locked so it never
 *     reflows layout on load.
 *
 * All ad copy is EN — EthicalAds serves tech/dev audiences primarily; a BM
 * fallback can be considered when we get real Malaysian ad demand.
 */
export function AdSlot({
  /** Semantic id EthicalAds uses to distinguish placements — e.g. "txn-below-ledger". */
  slotId,
  /** Warm one-line label so beta users know the space is intentional, not a bug. */
  placeholderLabel,
  /** Extra classes (margin, max-width). Component sizes itself with padding-top ratio. */
  className,
  /** Premium users bypass entirely. Passed from the app layout profile fetch. */
  isPremium = false,
}: {
  slotId: string;
  placeholderLabel?: string;
  className?: string;
  isPremium?: boolean;
}) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "1";
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || isPremium) return;
    // EthicalAds picks up any `[data-ea-publisher]` div once its own script
    // has loaded (loaded in RootLayout only under the same env gate). We
    // don't call anything imperatively — it re-scans on hydration + on route
    // change. If we later swap networks (Media.net, etc.), only this effect
    // needs adjusting.
  }, [enabled, isPremium]);

  if (isPremium) return null;

  if (!enabled) {
    // Placeholder mode — dev, preview, or production before we flip the flag.
    return (
      <div
        className={cn(
          "mx-auto my-6 flex w-full max-w-[728px] items-center justify-center rounded-card border border-dashed border-divider bg-card/50 px-4 py-6 text-xs font-semibold uppercase tracking-wider text-muted",
          className,
        )}
        aria-label="Advertisement placeholder"
      >
        <span>{placeholderLabel ?? "Ad space · beta"}</span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto my-6 flex w-full max-w-[728px] justify-center",
        className,
      )}
      // EthicalAds attributes — swap the publisher id when we're approved.
      // The `data-ea-style` fixes the aspect ratio so the placement never
      // reflows layout when the ad loads.
      data-ea-publisher={process.env.NEXT_PUBLIC_ETHICALADS_PUBLISHER ?? "placeholder"}
      data-ea-type="image"
      data-ea-style="stickybox"
      data-ea-keywords="finance|budget|malaysia|personal-finance"
      data-ea-slot={slotId}
    />
  );
}

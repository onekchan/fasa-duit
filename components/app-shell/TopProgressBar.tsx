"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A minimal top progress bar for route transitions. React 19's App Router
 * doesn't expose transition events directly, but a pathname change is enough
 * of a signal to fire a brief animation. The bar:
 *   1. Fires on every Link/router.push navigation
 *   2. Animates from 0 → 80% over ~400ms
 *   3. On the *next* pathname change (route committed) it snaps to 100% and
 *      fades out over 200ms
 *
 * Warm terracotta color that matches the design system. Fixed to the top of
 * the viewport at z-50 so it sits above the sticky nav.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the initial mount — we only want progress on real transitions.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // A pathname change means the destination has already rendered (SSR is
    // complete). Snap the bar to 100 then fade out.
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      // Reset back to 0 after fade completes so the next transition starts clean.
      setTimeout(() => setProgress(0), 220);
    }, 60);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, search]);

  // Intercept clicks on same-origin links so we can pre-animate to 80% while
  // the router is still resolving. On next.js this happens before the
  // pathname state actually changes.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (target.target === "_blank") return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      // Kick off the progress animation
      setVisible(true);
      setProgress(80);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full bg-brand"
        style={{
          width: `${progress}%`,
          transition: "width 300ms ease-out",
        }}
      />
    </div>
  );
}

"use client";

import { useLayoutEffect } from "react";

/**
 * Applies the user's theme preference to `<html data-theme="...">` so the
 * design-token overrides in globals.css switch palettes. Runs on mount and
 * whenever the preference changes.
 *
 * How the CSS reads it (matches `app/globals.css`):
 *   * `data-theme="light"`  → force light tokens even in an OS-dark browser
 *   * `data-theme="dark"`   → force dark tokens even in an OS-light browser
 *   * no attribute (system) → tokens follow `prefers-color-scheme`
 *
 * Uses useLayoutEffect so the attribute lands before the first paint (in a
 * client component after hydration — SSR renders with no attribute, which is
 * the "system" default and matches what an unauthenticated visitor sees).
 *
 * We also store the choice in localStorage under `fasa-theme` so a companion
 * inline script in the root layout can apply it on the NEXT page load before
 * hydration, killing the flash of the wrong theme when a user with a
 * non-system preference comes back to the app.
 */
export function ThemeApplier({ theme }: { theme: "system" | "light" | "dark" }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("fasa-theme", theme);
    } catch {
      /* private-mode / storage disabled — non-fatal, next visit falls back. */
    }
  }, [theme]);

  return null;
}

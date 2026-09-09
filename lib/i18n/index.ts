import { en } from "./en";
import { ms } from "./ms";

export type Language = "en" | "ms";
export type Catalog = typeof en;

const catalogs = { en, ms } satisfies Record<Language, Catalog>;

/**
 * Look up a catalog by language code. Falls back to English if the code is
 * unknown. Both catalogs must share the exact same shape — the `satisfies`
 * clause above enforces it at compile time.
 */
export function t(lang: Language | string | null | undefined): Catalog {
  const key = (lang ?? "en") as Language;
  return catalogs[key] ?? en;
}

/**
 * Small string-interpolation helper: fmt("{n} things", {n: 3}) → "3 things".
 */
export function fmt(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

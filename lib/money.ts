/**
 * money.ts — integer-sen arithmetic + formatting.
 * 1 RM = 100 sen. NEVER store or arithmetic-on money as a JS float; always
 * round-trip through these helpers. Banker's (half-to-even) rounding applied
 * at display time only. Ported verbatim from the prototype's window.money.
 *
 * NOTE for DB: money columns are BIGINT sen. APR is `apr_bps` (basis points,
 * 0..100000 = 0..1000%). Percents in this file are basis points, not decimals.
 */

export type Sen = number;

/** Add any number of sen amounts. Always exact integer arithmetic. */
export function add(...sens: Sen[]): Sen {
  return sens.reduce((a, b) => a + b, 0);
}

/** a − b, exact. */
export function subtract(a: Sen, b: Sen): Sen {
  return a - b;
}

/** Multiply sen by a scalar (e.g. tax rate). Banker's-rounded to sen. */
export function multiply(sen: Sen, scalar: number): Sen {
  return bankersRound(sen * scalar);
}

/** Divide sen by an integer divisor; banker's-rounded to sen. */
export function divide(sen: Sen, divisor: number): Sen {
  return bankersRound(sen / divisor);
}

/**
 * Percent as basis points (0..10000 = 0..100%).
 * `percent(10000, 1000)` → 1000 sen (10% of RM 100.00).
 */
export function percent(sen: Sen, pctBps: number): Sen {
  return bankersRound((sen * pctBps) / 10000);
}

/** Half-to-even ("banker's") rounding for a Number → Integer. */
export function bankersRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  // Exactly .5 → round to even
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * Split a total into `weights.length` shares whose sum EXACTLY equals the total.
 * Any rounding remainder goes into the largest weight (ties → lowest index).
 * Used for the 50/30/20 bucket allocations so they always sum to income to the
 * last sen.
 */
export function splitExact(total_sen: Sen, weights: number[]): Sen[] {
  const wsum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => Math.floor((total_sen * w) / wsum));
  const used = raw.reduce((a, b) => a + b, 0);
  const remainder = total_sen - used;

  let biggest = 0;
  for (let i = 1; i < weights.length; i++) {
    if ((weights[i] ?? 0) > (weights[biggest] ?? 0)) biggest = i;
  }
  raw[biggest] = (raw[biggest] ?? 0) + remainder;
  return raw;
}

/**
 * Parse "RM 1,234.56", "1234.56", or a number → sen. Returns null on garbage.
 * Accepts a leading "-" for negatives.
 */
export function parse(input: string | number | null | undefined): Sen | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  if (typeof input !== "string") return null;

  const cleaned = input.replace(/[^\d.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export interface FormatOptions {
  /** ISO 4217 currency code. Default: "MYR". */
  currency?: string;
  /** BCP 47 locale. Default: "en-MY". */
  locale?: string;
  /** Include the currency symbol/prefix. Default: true. */
  showSymbol?: boolean;
}

/**
 * Format sen → "RM 1,234.56" (default) or another currency + locale.
 * For MYR the format is enforced as `RM 1,234.56` (space after RM, comma
 * thousands, always 2 decimals) regardless of the locale's own preference.
 */
export function format(sen: Sen, opts: FormatOptions = {}): string {
  const { currency = "MYR", locale = "en-MY", showSymbol = true } = opts;
  const value = sen / 100;

  if (currency === "MYR" && showSymbol) {
    const abs = Math.abs(value).toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (value < 0 ? "-RM " : "RM ") + abs;
  }

  return value.toLocaleString(locale, {
    style: showSymbol ? "currency" : "decimal",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Currency symbol lookup for money-input prefixes. */
export function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    MYR: "RM",
    SGD: "S$",
    USD: "$",
    AUD: "A$",
    GBP: "£",
    EUR: "€",
    IDR: "Rp",
    THB: "฿",
    PHP: "₱",
    JPY: "¥",
  };
  return map[code] ?? code;
}

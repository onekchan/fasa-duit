/**
 * Recurring transactions — helpers.
 *
 * v1 schedule shape (monthly only):
 *   { freq: "monthly", day: 1..31 }
 *
 * v1 template shape (mirrors transactions Insert minus user_id/date/id):
 *   { amount_sen: number (signed), account_id: string|null,
 *     category_id: string|null, merchant: string, notes: string,
 *     tags: string[] }
 *
 * End-of-month rule: if `day = 31` and the target month has 30 days, the
 * transaction posts on the 30th. Next iteration returns to `day` in the
 * following month. Matches the SQL `post_due_recurring` function.
 */

import type { Json } from "@/types/supabase";

export type MonthlySchedule = { freq: "monthly"; day: number };

export type RecurringTemplate = {
  amount_sen: number;
  account_id: string | null;
  category_id: string | null;
  merchant: string;
  notes: string;
  tags: string[];
};

/** Number of days in the given month (1-indexed month: 1=Jan..12=Dec). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Given a monthly schedule day (1..31) and a reference "from" date (ISO),
 * return the ISO date of the next occurrence STRICTLY AFTER `from`.
 * Clamps `day` at month-end (day=31 in Feb → Feb 28/29).
 */
function partsOf(iso: string): { y: number; m: number; d: number } {
  const parts = iso.slice(0, 10).split("-");
  return {
    y: Number(parts[0] ?? 0),
    m: Number(parts[1] ?? 1),
    d: Number(parts[2] ?? 1),
  };
}

export function nextMonthlyRunAfter(day: number, fromIso: string): string {
  const { y, m, d } = partsOf(fromIso);
  let year = y;
  let month = m; // 1..12
  // Try the SAME month first — if the clamped day is still after `d`, use it.
  const clampedThisMonth = Math.min(day, daysInMonth(year, month));
  if (clampedThisMonth > d) {
    return isoOf(year, month, clampedThisMonth);
  }
  // Otherwise roll to next month (wrap the year).
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  const clampedNextMonth = Math.min(day, daysInMonth(year, month));
  return isoOf(year, month, clampedNextMonth);
}

/**
 * First run date given a monthly schedule day and today. If today's day is <=
 * `day`, we schedule for THIS month; otherwise next month. Both clamped.
 */
export function firstMonthlyRun(day: number, todayIso: string): string {
  const { y, m, d } = partsOf(todayIso);
  const clampedThis = Math.min(day, daysInMonth(y, m));
  if (clampedThis >= d) return isoOf(y, m, clampedThis);
  // Roll to next month
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  return isoOf(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

function isoOf(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Human-readable schedule summary — used in the list row.
 * "Monthly on the 25th" / "Monthly on the last day"
 */
export function describeSchedule(sched: MonthlySchedule, lang: "en" | "ms" = "en"): string {
  const day = sched.day;
  const en = day >= 29
    ? `Monthly on the last day` // 29/30/31 all clamp to last day for shortest months
    : `Monthly on the ${ordinal(day)}`;
  const ms = day >= 29
    ? `Bulanan pada hari terakhir`
    : `Bulanan pada hari ke-${day}`;
  return lang === "ms" ? ms : en;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th";
  return `${n}${suffix}`;
}

/** Type guards + JSON casts so callers don't have to cast Json everywhere. */
export function asSchedule(json: Json): MonthlySchedule {
  if (
    typeof json === "object" &&
    json !== null &&
    !Array.isArray(json) &&
    (json as { freq?: unknown }).freq === "monthly" &&
    typeof (json as { day?: unknown }).day === "number"
  ) {
    return { freq: "monthly", day: (json as { day: number }).day };
  }
  return { freq: "monthly", day: 1 };
}

export function asTemplate(json: Json): RecurringTemplate {
  const obj = typeof json === "object" && json !== null && !Array.isArray(json) ? json : {};
  const o = obj as Record<string, unknown>;
  return {
    amount_sen: typeof o.amount_sen === "number" ? o.amount_sen : 0,
    account_id: typeof o.account_id === "string" ? o.account_id : null,
    category_id: typeof o.category_id === "string" ? o.category_id : null,
    merchant: typeof o.merchant === "string" ? o.merchant : "",
    notes: typeof o.notes === "string" ? o.notes : "",
    tags: Array.isArray(o.tags) ? (o.tags.filter((t) => typeof t === "string") as string[]) : [],
  };
}

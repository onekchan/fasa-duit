/**
 * Sinking-funds math + icon set. Ported from the prototype so the SaaS
 * behavior matches. Amounts stay integer sen throughout.
 */

/** Whole months between two ISO dates (0 or greater). */
export function monthsBetween(fromIso: string, toIso: string): number {
  const f = new Date(fromIso);
  const t = new Date(toIso);
  if (isNaN(+f) || isNaN(+t)) return 0;
  return Math.max(
    0,
    (t.getFullYear() - f.getFullYear()) * 12 +
      (t.getMonth() - f.getMonth()) +
      (t.getDate() >= f.getDate() ? 0 : -1),
  );
}

/** Required monthly contribution to hit a remaining target in N months. */
export function sinkingRequiredMonthly_sen(
  remaining_sen: number,
  months_remaining: number,
): number {
  if (months_remaining <= 0) return remaining_sen;
  return Math.ceil(remaining_sen / months_remaining);
}

export type FundIconName =
  | "piggy"
  | "moon"
  | "car"
  | "laptop"
  | "baby"
  | "shield"
  | "cap"
  | "heart"
  | "plane"
  | "home";

export const FUND_ICONS: readonly FundIconName[] = [
  "piggy",
  "moon",
  "car",
  "laptop",
  "baby",
  "shield",
  "cap",
  "heart",
  "plane",
  "home",
];

export interface Contribution {
  date: string;
  amount_sen: number;
}

export interface Fund {
  id: string;
  user_id?: string;
  name: string;
  target_sen: number;
  target_date: string;
  icon: FundIconName | string;
  linked_category_id: string | null;
  contributions: Contribution[];
  created_at: string;
  archived?: boolean;
}

interface TxnLite {
  id: string;
  amount_sen: number;
  category_id: string | null;
  date: string;
}

/** Derived state used by every fund card. Pure — safe on server and client. */
export function computeFundState(
  fund: Fund,
  transactions: TxnLite[] = [],
  todayIsoOverride?: string,
) {
  const todayIso = todayIsoOverride ?? new Date().toISOString().slice(0, 10);

  const manualContribs = fund.contributions ?? [];
  const manual_sen = manualContribs.reduce(
    (a, c) => a + (c.amount_sen ?? 0),
    0,
  );

  let linked_sen = 0;
  let linkedCount = 0;
  if (fund.linked_category_id) {
    for (const tx of transactions) {
      if (tx.category_id !== fund.linked_category_id) continue;
      if (tx.amount_sen >= 0) continue;
      linked_sen += Math.abs(tx.amount_sen);
      linkedCount++;
    }
  }

  const saved_sen = manual_sen + linked_sen;
  const target = fund.target_sen ?? 0;
  const remaining_sen = Math.max(0, target - saved_sen);
  const done = saved_sen >= target;

  const months_remaining = fund.target_date
    ? monthsBetween(todayIso, fund.target_date)
    : 0;

  const required_monthly_sen = done
    ? 0
    : sinkingRequiredMonthly_sen(remaining_sen, Math.max(1, months_remaining));

  const total_months =
    fund.created_at && fund.target_date
      ? Math.max(1, monthsBetween(fund.created_at, fund.target_date))
      : 12;
  const elapsed_months = fund.created_at
    ? Math.max(0, monthsBetween(fund.created_at, todayIso))
    : 0;
  const expected_pct = Math.min(100, (elapsed_months / total_months) * 100);
  const actual_pct = target > 0 ? (saved_sen / target) * 100 : 0;

  let status: "done" | "ahead" | "ontrack" | "behind" = "ontrack";
  if (done) status = "done";
  else if (actual_pct >= expected_pct + 5) status = "ahead";
  else if (actual_pct < expected_pct - 5) status = "behind";

  let projected_iso: string | null = null;
  if (!done && elapsed_months > 0 && saved_sen > 0) {
    const monthly_pace = saved_sen / elapsed_months;
    if (monthly_pace > 0) {
      const months_to_go = Math.ceil(remaining_sen / monthly_pace);
      const d = new Date();
      d.setMonth(d.getMonth() + months_to_go);
      projected_iso = d.toISOString().slice(0, 10);
    }
  } else if (done) {
    projected_iso = todayIso;
  }

  return {
    saved_sen,
    remaining_sen,
    manual_sen,
    linked_sen,
    linkedCount,
    required_monthly_sen,
    months_remaining,
    actual_pct: Math.min(100, actual_pct),
    expected_pct,
    status,
    projected_iso,
    done,
  };
}

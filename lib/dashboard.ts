/**
 * Dashboard math + range helpers. Kept small and pure so it stays testable
 * and shareable between the RSC and the client.
 */

import { splitExact, bankersRound } from "./money";

/** Warm palette for donut segments. Cycles across 10 hues. */
export const DIST_COLORS = [
  "#C8553D", "#6B8E5A", "#D98E3A", "#8C5A3C", "#A03E2F",
  "#5F7A6B", "#B08056", "#6E4A3A", "#C79A5B", "#8F6E52",
];

export type RangeKind = "thisMonth" | "lastMonth" | "last3" | "last12";

export function computeRange(kind: RangeKind): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (kind === "thisMonth") return { from: iso(new Date(y, m, 1)), to: iso(now) };
  if (kind === "lastMonth") return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
  if (kind === "last3")     return { from: iso(new Date(y, m - 3, 1)), to: iso(now) };
  return                            { from: iso(new Date(y, m - 12, 1)), to: iso(now) };
}

interface Category {
  id: string;
  name: string;
  bucket: "needs" | "wants" | "savings";
}
interface Txn {
  id: string;
  date: string;
  amount_sen: number;
  category_id: string | null;
  merchant: string | null;
}

/** Sum current-month expenses by bucket. Income (positive amounts) ignored. */
export function bucketSpend(txns: Txn[], categories: Category[]) {
  const catBucket = Object.fromEntries(categories.map((c) => [c.id, c.bucket]));
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const acc = { needs: 0, wants: 0, savings: 0 } as Record<"needs" | "wants" | "savings", number>;
  for (const t of txns) {
    if (!t.date?.startsWith(ym)) continue;
    if (t.amount_sen >= 0) continue;
    const bucket = t.category_id ? catBucket[t.category_id] : undefined;
    if (!bucket || !(bucket in acc)) continue;
    acc[bucket] += Math.abs(t.amount_sen);
  }
  return acc;
}

/** Split total income into the three buckets so the sum is exact to the sen. */
export function bucketAllocation(
  income_sen: number,
  split: { needs: number; wants: number; savings: number },
): { needs: number; wants: number; savings: number } {
  const [n, w, s] = splitExact(income_sen, [split.needs, split.wants, split.savings]);
  return { needs: n ?? 0, wants: w ?? 0, savings: s ?? 0 };
}

/** Days remaining in the current calendar month, inclusive of today. */
export function daysLeftInMonth(): number {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return daysInMonth - now.getDate();
}

/** Expense distribution aggregations for the donut / top-merchants panels. */
export function distributionAgg(
  txns: Txn[],
  categories: Category[],
  range: { from: string; to: string },
) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const inRange = txns.filter(
    (t) => t.amount_sen < 0 && t.date && t.date >= range.from && t.date <= range.to,
  );
  const byCatMap = new Map<string, { catId: string; name: string; sen: number }>();
  let total = 0;
  for (const t of inRange) {
    const sen = Math.abs(t.amount_sen);
    total += sen;
    const key = t.category_id ?? "__uncat";
    const name = t.category_id ? catById[t.category_id]?.name ?? "—" : "—";
    const prev = byCatMap.get(key) ?? { catId: key, name, sen: 0 };
    prev.sen += sen;
    byCatMap.set(key, prev);
  }
  const byCategory = [...byCatMap.values()]
    .map((r) => ({ ...r, pct: total > 0 ? (r.sen / total) * 100 : 0 }))
    .sort((a, b) => b.sen - a.sen);

  const byMerchMap = new Map<string, number>();
  for (const t of inRange) {
    const name = (t.merchant ?? "").trim();
    if (!name) continue;
    byMerchMap.set(name, (byMerchMap.get(name) ?? 0) + Math.abs(t.amount_sen));
  }
  const topMerchants = [...byMerchMap.entries()]
    .map(([name, sen]) => ({ name, sen }))
    .sort((a, b) => b.sen - a.sen)
    .slice(0, 5);

  return { byCategory, topMerchants, total };
}

/** Bank the number 0-round: helper re-export so consumers don't need money.ts. */
export const round = bankersRound;

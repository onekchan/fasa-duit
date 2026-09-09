/**
 * Date helpers. All app-facing dates are DD/MM/YYYY; DB stores ISO YYYY-MM-DD.
 * Week starts Monday (Malaysian convention).
 */

/** Format an ISO YYYY-MM-DD string as DD/MM/YYYY for UI display. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.slice(0, 10).split("-");
  const [y, m, d] = parts;
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/** Today as ISO YYYY-MM-DD in the browser's local timezone. */
export function todayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

/** ISO date for `daysAgo` days before today. `daysAgo = 0` is today. */
export function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

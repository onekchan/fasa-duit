"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { format as fmoney, currencySymbol as _currencySymbol } from "@/lib/money";
import { fmt, t as tByLang, type Language } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeFundState, type Fund } from "@/lib/funds";
import { FundIconGlyph } from "@/components/ui/FundIconGlyph";
import {
  DIST_COLORS,
  bucketAllocation,
  bucketSpend,
  computeRange,
  daysLeftInMonth,
  distributionAgg,
  type RangeKind,
} from "@/lib/dashboard";

interface Txn {
  id: string;
  date: string;
  amount_sen: number;
  category_id: string | null;
  merchant: string | null;
}
interface Cat {
  id: string;
  name: string;
  bucket: "needs" | "wants" | "savings";
}

const _ = _currencySymbol; // silence unused import in some tree-shakes

export function DashboardClient({
  language,
  currency,
  income_sen,
  split,
  initialTransactions,
  categories,
  initialFunds = [],
}: {
  language: Language;
  currency: string;
  income_sen: number;
  split: { needs: number; wants: number; savings: number };
  initialTransactions: Txn[];
  categories: Cat[];
  initialFunds?: Fund[];
}) {
  const strings = tByLang(language);
  const d = strings.dashboard;
  const dist = strings.dist;
  const router = useRouter();

  const [rows, setRows] = useState<Txn[]>(initialTransactions);
  const [funds, setFunds] = useState<Fund[]>(initialFunds);
  const [rangeKind, setRangeKind] = useState<RangeKind>("thisMonth");
  const range = useMemo(() => computeRange(rangeKind), [rangeKind]);

  /**
   * Jump to the ledger filtered by the clicked category. Skips synthetic ids
   * (`__other` = aggregated tail, `__uncat` = no category assigned) since they
   * can't map to a single filter row.
   */
  const goToLedgerForCategory = (catId: string) => {
    if (!catId || catId.startsWith("__")) return;
    router.push(`/transactions?category=${encodeURIComponent(catId)}`);
  };

  // ── Realtime: subscribe once, merge into `rows` ──────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const userId = data.user?.id;
      if (!userId) return;

      const channel = supabase
        .channel(`dash-live-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setRows((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Txn;
                if (prev.some((r) => r.id === next.id)) return prev;
                return [next, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Txn;
                return prev.map((r) => (r.id === next.id ? next : r));
              }
              if (payload.eventType === "DELETE") {
                const old = payload.old as { id: string };
                return prev.filter((r) => r.id !== old.id);
              }
              return prev;
            });
          },
        )
        .subscribe();
      channelRef = channel;
      if (cancelled) supabase.removeChannel(channel);
    });

    return () => {
      cancelled = true;
      if (channelRef) void supabase.removeChannel(channelRef);
    };
  }, []);

  // ── Realtime for sinking funds — nudge card ──────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const userId = data.user?.id;
      if (!userId) return;

      const channel = supabase
        .channel(`dash-funds-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sinking_funds",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setFunds((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Fund;
                if (prev.some((r) => r.id === next.id)) return prev;
                return [next, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Fund;
                return prev.map((r) => (r.id === next.id ? next : r));
              }
              if (payload.eventType === "DELETE") {
                const old = payload.old as { id: string };
                return prev.filter((r) => r.id !== old.id);
              }
              return prev;
            });
          },
        )
        .subscribe();
      channelRef = channel;
      if (cancelled) supabase.removeChannel(channel);
    });

    return () => {
      cancelled = true;
      if (channelRef) void supabase.removeChannel(channelRef);
    };
  }, []);

  // ── Aggregations (recompute on change) ───────────────────────────────────
  const spent = useMemo(() => bucketSpend(rows, categories), [rows, categories]);
  const budgets = useMemo(() => bucketAllocation(income_sen, split), [income_sen, split]);
  const daysLeft = daysLeftInMonth();
  const { byCategory, topMerchants, total: distTotal } = useMemo(
    () => distributionAgg(rows, categories, range),
    [rows, categories, range],
  );

  // Top 8 + "Other" grouping so the donut stays readable
  const grouped = useMemo(() => {
    if (byCategory.length <= 9) return byCategory;
    const top = byCategory.slice(0, 8);
    const rest = byCategory.slice(8);
    const otherSen = rest.reduce((a, b) => a + b.sen, 0);
    const otherPct = distTotal > 0 ? (otherSen / distTotal) * 100 : 0;
    return [
      ...top,
      { catId: "__other", name: dist.other, sen: otherSen, pct: otherPct },
    ];
  }, [byCategory, distTotal, dist.other]);

  const colorFor = (idx: number) => DIST_COLORS[idx % DIST_COLORS.length] ?? "#000000";

  // Pick first not-done fund with a positive required monthly — that's the
  // nudge target. Ordered by target date so nearest goals surface first.
  const nudge = useMemo(() => {
    const sorted = [...funds].sort((a, b) =>
      a.target_date < b.target_date ? -1 : 1,
    );
    for (const f of sorted) {
      const s = computeFundState(f, rows);
      if (!s.done && s.required_monthly_sen > 0) {
        return { fund: f, amount_sen: s.required_monthly_sen };
      }
    }
    return null;
  }, [funds, rows]);

  const ranges: Array<[RangeKind, string]> = [
    ["thisMonth", dist.ranges.thisMonth],
    ["lastMonth", dist.ranges.lastMonth],
    ["last3", dist.ranges.last3],
    ["last12", dist.ranges.last12],
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl">{d.title}</h1>

      {/* 50/30/20 meters */}
      <Card elevated>
        <Meter
          label={d.needs}
          spent={spent.needs}
          budget={budgets.needs}
          currency={currency}
          t={d}
        />
        <Meter
          label={d.wants}
          spent={spent.wants}
          budget={budgets.wants}
          currency={currency}
          t={d}
        />
        <Meter
          label={d.savings}
          spent={spent.savings}
          budget={budgets.savings}
          currency={currency}
          t={d}
        />
        <p className="mt-4 text-sm text-muted">
          {daysLeft} {d.daysLeft}
        </p>
      </Card>

      {/* Sinking-fund nudge card */}
      {nudge && (
        <Link
          href="/funds"
          className="flex items-center gap-3 rounded-card border border-divider bg-card px-5 py-4 transition-colors hover:bg-surface"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-divider bg-surface text-brand">
            <FundIconGlyph name={nudge.fund.icon} size={18} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-ink">{nudge.fund.name}</div>
            <div className="mt-0.5 text-sm text-muted">
              {fmt(strings.funds.nudge, {
                amount: fmoney(nudge.amount_sen, { currency }),
                name: nudge.fund.name,
              })}
            </div>
          </div>
        </Link>
      )}

      {/* Distribution donut + ranked list */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card elevated>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg">{dist.title}</h3>
            <div
              className="inline-flex flex-wrap gap-0.5 rounded-lg border border-divider bg-surface p-0.5"
              role="tablist"
              aria-label="Range"
            >
              {ranges.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={rangeKind === k}
                  onClick={() => setRangeKind(k)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    rangeKind === k
                      ? "bg-card text-ink shadow-sm"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-4 text-sm text-muted">{dist.subhead}</p>

          {distTotal === 0 ? (
            <p className="py-12 text-center text-muted">{dist.empty}</p>
          ) : (
            <>
              <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={grouped}
                      dataKey="sen"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={1}
                      stroke="var(--bg)"
                      strokeWidth={2}
                      isAnimationActive
                      animationDuration={400}
                      onClick={(seg) => {
                        // Recharts hands us the datum in seg.payload (v2)
                        const catId = (seg?.payload?.catId ?? seg?.catId) as
                          | string
                          | undefined;
                        if (catId) goToLedgerForCategory(catId);
                      }}
                    >
                      {grouped.map((row, idx) => {
                        const clickable = !row.catId.startsWith("__");
                        return (
                          <Cell
                            key={row.catId}
                            fill={colorFor(idx)}
                            style={{ cursor: clickable ? "pointer" : "default" }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip content={<DonutTip currency={currency} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="font-display text-2xl font-semibold tabular-nums text-ink">
                    {fmoney(distTotal, { currency })}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{dist.totalSpent}</div>
                </div>
              </div>

              {/* Ranked list — same click behaviour as donut slices */}
              <div className="mt-4 flex flex-col gap-1">
                {grouped.map((row, idx) => {
                  const clickable = !row.catId.startsWith("__");
                  const inner = (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: colorFor(idx) }}
                      />
                      <span className="text-ink">{row.name}</span>
                      <span className="text-right font-semibold tabular-nums">
                        {fmoney(row.sen, { currency })}
                      </span>
                      <span className="text-right text-xs text-muted tabular-nums">
                        {row.pct.toFixed(1)}%
                      </span>
                    </>
                  );
                  return clickable ? (
                    <button
                      key={row.catId}
                      type="button"
                      onClick={() => goToLedgerForCategory(row.catId)}
                      className="grid grid-cols-[10px_1fr_auto_44px] items-center gap-2 rounded-md px-1 py-1 text-left text-sm transition-colors hover:bg-card"
                    >
                      {inner}
                    </button>
                  ) : (
                    <div
                      key={row.catId}
                      className="grid grid-cols-[10px_1fr_auto_44px] items-center gap-2 rounded-md px-1 py-1 text-sm"
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Top merchants */}
        <Card>
          <h3 className="font-display text-lg">{dist.topMerchants}</h3>
          {topMerchants.length === 0 ? (
            <p className="mt-3 text-muted">{dist.empty}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-1">
              {topMerchants.map((m) => (
                <Link
                  key={m.name}
                  href={`/transactions?merchant=${encodeURIComponent(m.name)}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md px-1 py-2 text-sm hover:bg-card"
                >
                  <span className="text-ink">{m.name}</span>
                  <span className="font-semibold tabular-nums">
                    {fmoney(m.sen, { currency })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** 50/30/20 meter row — spent vs budget with over-color when spent > budget. */
function Meter({
  label,
  spent,
  budget,
  currency,
  t,
}: {
  label: string;
  spent: number;
  budget: number;
  currency: string;
  t: ReturnType<typeof tByLang>["dashboard"];
}) {
  const over = spent > budget;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const remaining = budget - spent;

  return (
    <div className="my-3">
      {/* Mobile: label stacks above the stats line so the two never collide
          at 375px. Desktop keeps them on the same baseline row via sm:. */}
      <div className="mb-1.5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <span className="font-semibold">{label}</span>
        <span className="text-xs text-muted tabular-nums">
          {fmoney(spent, { currency })} {t.spent} · {fmoney(Math.max(0, remaining), { currency })}{" "}
          {t.remaining} · {pct}% {t.used}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-divider">
        <div
          className={cn(
            "h-full rounded-pill transition-all duration-200",
            over ? "bg-danger" : "bg-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Custom Recharts tooltip that reads theme tokens. */
function DonutTip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; sen: number; pct: number } }>;
  currency: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg bg-ink px-3 py-2 text-sm text-bg shadow-md">
      <div className="font-semibold">{p.name}</div>
      <div className="tabular-nums">
        {fmoney(p.sen, { currency })} · {p.pct.toFixed(1)}%
      </div>
    </div>
  );
}

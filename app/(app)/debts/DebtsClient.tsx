"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { format as fmoney, currencySymbol, parse as pmoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { fmt, t as tByLang, type Language } from "@/lib/i18n";
import {
  DEBT_TYPES,
  simulateDebts,
  type DebtInput,
  type DebtType,
  type SimulationResult,
} from "@/lib/debt";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, MoneyInput, Select, TextInput } from "@/components/ui/field";
import { AdSlot } from "@/components/ads/AdSlot";
import { cn } from "@/lib/utils";
import {
  createDebt,
  deleteDebt as deleteDebtAction,
  restoreDebt,
  setIslamicMode,
  updateDebt as updateDebtAction,
} from "./actions";

interface Debt {
  id: string;
  user_id?: string;
  name: string;
  type: DebtType;
  balance_sen: number;
  apr_bps: number;
  min_payment_sen: number;
  archived?: boolean;
  created_at?: string;
}
interface Toast {
  id: string;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
}

export function DebtsClient({
  language,
  currency,
  initialIslamic,
  initialDebts,
}: {
  language: Language;
  currency: string;
  initialIslamic: boolean;
  initialDebts: Debt[];
}) {
  const strings = tByLang(language);
  const t = strings.debts;

  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [islamic, setIslamic] = useState(initialIslamic);
  const [editing, setEditing] = useState<null | "new" | Debt>(null);
  const [extraStr, setExtraStr] = useState("0");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  const extra_sen = Math.max(0, pmoney(extraStr) ?? 0);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const userId = data.user?.id;
      if (!userId) return;
      const channel = supabase
        .channel(`debts-live-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "debts",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setDebts((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Debt;
                if (prev.some((r) => r.id === next.id)) return prev;
                return [next, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Debt;
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

  const pushToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { id, ...toast }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 5000);
  };

  const totals = useMemo(() => {
    let owed = 0;
    let min = 0;
    for (const d of debts) {
      owed += d.balance_sen ?? 0;
      min += d.min_payment_sen ?? 0;
    }
    return { owed, min };
  }, [debts]);

  const activeDebts: DebtInput[] = useMemo(
    () =>
      debts
        .filter((d) => (d.balance_sen ?? 0) > 0)
        .map((d) => ({
          id: d.id,
          name: d.name,
          balance_sen: d.balance_sen,
          apr_bps: d.apr_bps,
          min_payment_sen: d.min_payment_sen,
        })),
    [debts],
  );

  const snowball = useMemo<SimulationResult | null>(
    () => (activeDebts.length ? simulateDebts(activeDebts, "snowball", extra_sen) : null),
    [activeDebts, extra_sen],
  );
  const avalanche = useMemo<SimulationResult | null>(
    () => (activeDebts.length ? simulateDebts(activeDebts, "avalanche", extra_sen) : null),
    [activeDebts, extra_sen],
  );

  // Winner: lower total interest; tie-break by fewer months.
  let winnerKey: "snowball" | "avalanche" | null = null;
  let savings_sen = 0;
  if (snowball && avalanche) {
    if (avalanche.total_interest_sen < snowball.total_interest_sen) {
      winnerKey = "avalanche";
      savings_sen = snowball.total_interest_sen - avalanche.total_interest_sen;
    } else if (snowball.total_interest_sen < avalanche.total_interest_sen) {
      winnerKey = "snowball";
      savings_sen = avalanche.total_interest_sen - snowball.total_interest_sen;
    } else if (avalanche.months < snowball.months) {
      winnerKey = "avalanche";
    } else if (snowball.months < avalanche.months) {
      winnerKey = "snowball";
    }
  }
  const winning =
    winnerKey === "snowball" ? snowball : winnerKey === "avalanche" ? avalanche : snowball;

  const onCreate = (input: {
    name: string;
    type: DebtType;
    balance_sen: number;
    apr_bps: number;
    min_payment_sen: number;
  }) => {
    startTransition(async () => {
      try {
        await createDebt(input);
        setEditing(null);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onUpdate = (id: string, input: {
    name: string;
    type: DebtType;
    balance_sen: number;
    apr_bps: number;
    min_payment_sen: number;
  }) => {
    setDebts((cur) => cur.map((d) => (d.id === id ? { ...d, ...input } : d)));
    setEditing(null);
    startTransition(async () => {
      try {
        await updateDebtAction(id, input);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onDelete = (debt: Debt) => {
    if (!confirm(t.confirmDelete)) return;
    setDebts((cur) => cur.filter((d) => d.id !== debt.id));
    pushToast({
      message: t.deletedToast,
      undoLabel: strings.common.undo,
      onUndo: () => {
        setDebts((cur) => (cur.some((d) => d.id === debt.id) ? cur : [debt, ...cur]));
        startTransition(async () => {
          try {
            await restoreDebt({
              id: debt.id,
              name: debt.name,
              type: debt.type,
              balance_sen: debt.balance_sen,
              apr_bps: debt.apr_bps,
              min_payment_sen: debt.min_payment_sen,
            });
          } catch {
            /* ignore */
          }
        });
      },
    });
    startTransition(async () => {
      try {
        await deleteDebtAction(debt.id);
      } catch (e) {
        setDebts((cur) => (cur.some((d) => d.id === debt.id) ? cur : [debt, ...cur]));
        pushToast({ message: e instanceof Error ? e.message : "Delete failed" });
      }
    });
  };

  const onFlipIslamic = (value: boolean) => {
    setIslamic(value);
    startTransition(async () => {
      try {
        await setIslamicMode(value);
      } catch {
        setIslamic(!value);
      }
    });
  };

  const rateLabel = islamic ? t.islamic.profitRate : t.islamic.apr;
  const sym = currencySymbol(currency);
  const isEmpty = debts.length === 0 && !editing;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl">{t.title}</h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex gap-0.5 rounded-lg border border-divider bg-surface p-0.5">
            <button
              type="button"
              onClick={() => onFlipIslamic(false)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                !islamic ? "bg-card text-ink shadow-sm" : "text-muted",
              )}
            >
              {t.islamic.modeConventional}
            </button>
            <button
              type="button"
              onClick={() => onFlipIslamic(true)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                islamic ? "bg-card text-ink shadow-sm" : "text-muted",
              )}
            >
              {t.islamic.modeIslamic}
            </button>
          </div>
          {!editing && !isEmpty && <Button onClick={() => setEditing("new")}>{t.new}</Button>}
        </div>
      </div>

      {editing && (
        <DebtEditor
          key={editing === "new" ? "new" : editing.id}
          strings={strings}
          islamic={islamic}
          currency={currency}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(input) =>
            editing === "new" ? onCreate(input) : onUpdate(editing.id, input)
          }
        />
      )}

      {isEmpty ? (
        <Card elevated className="py-12 text-center">
          <div className="mx-auto mb-4 h-24 w-24 text-muted opacity-70">
            <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth={2}
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 40h56v36H20zM28 40V28a20 20 0 0 1 40 0v12" />
            </svg>
          </div>
          <h3 className="mb-2 font-display text-xl">{t.empty.title}</h3>
          <p className="mx-auto mb-5 max-w-md text-muted">{t.empty.note}</p>
          <Button onClick={() => setEditing("new")}>{t.addFirst}</Button>
        </Card>
      ) : (
        !editing && (
          <>
            {/* Totals inline */}
            <div className="mb-4 flex flex-wrap gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t.totals.totalOwed}
                </div>
                <div className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                  {fmoney(totals.owed, { currency })}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t.totals.totalMin}
                </div>
                <div className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                  {fmoney(totals.min, { currency })}
                </div>
              </div>
            </div>

            {/* Plain-English primer */}
            <Card className="mb-4">
              <h4 className="mb-1.5 font-display text-base">{t.primer.title}</h4>
              <p className="text-sm text-muted">{t.primer.sub}</p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-1">
                    <span className="mr-2 inline-block rounded-pill bg-accent/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                      {t.primer.snowball.badge}
                    </span>
                    <span className="font-semibold text-ink">{t.primer.snowball.h}</span>
                  </div>
                  <p className="text-sm text-muted">{t.primer.snowball.p}</p>
                </div>
                <div>
                  <div className="mb-1">
                    <span className="mr-2 inline-block rounded-pill bg-brand/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand">
                      {t.primer.avalanche.badge}
                    </span>
                    <span className="font-semibold text-ink">{t.primer.avalanche.h}</span>
                  </div>
                  <p className="text-sm text-muted">{t.primer.avalanche.p}</p>
                </div>
              </div>
            </Card>

            {/* Non-intrusive ad slot — natural pause between the strategy
                primer and the extra-payment slider. Money inputs stay ad-free
                per plan.md rules. */}
            <AdSlot slotId="debts-between-primer-and-slider" placeholderLabel="Ad space · between primer and slider" />

            {/* Extra payment slider */}
            {activeDebts.length > 0 && (
              <Card className="mb-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-semibold text-ink">{t.extra.title}</div>
                  <div className="text-sm text-muted">{t.extra.hint}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <input
                    type="range"
                    min={0}
                    max={3000}
                    step={50}
                    value={Math.min(3000, Math.round(extra_sen / 100))}
                    onChange={(ev) => setExtraStr(ev.target.value)}
                    aria-label={t.extra.title}
                    className="accent-brand"
                  />
                  <MoneyInput
                    prefix={sym}
                    value={extraStr}
                    onChange={(ev) => setExtraStr(ev.target.value)}
                    onBlur={() => {
                      const v = Math.max(0, pmoney(extraStr) ?? 0);
                      setExtraStr(Math.round(v / 100).toString());
                    }}
                    className="w-40"
                    aria-label={t.extra.title}
                  />
                </div>
              </Card>
            )}

            {/* Strategy cards */}
            {activeDebts.length > 0 && (
              <div className="mb-4 grid gap-4 lg:grid-cols-2">
                <StrategyCard
                  strings={strings}
                  currency={currency}
                  sim={snowball}
                  keyName="snowball"
                  isWinner={winnerKey === "snowball"}
                />
                <StrategyCard
                  strings={strings}
                  currency={currency}
                  sim={avalanche}
                  keyName="avalanche"
                  isWinner={winnerKey === "avalanche"}
                />
              </div>
            )}

            {/* Savings callout */}
            {winnerKey && savings_sen > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-card border border-divider bg-card px-5 py-4">
                <span className="font-display text-2xl font-bold text-brand tabular-nums">
                  {fmoney(savings_sen, { currency })}
                </span>
                <span className="flex-1 text-sm text-muted">
                  {fmt(t.strat.savings, {
                    amount: fmoney(savings_sen, { currency }),
                    name: t.strat[winnerKey],
                  })}
                </span>
              </div>
            )}
            {snowball && avalanche && savings_sen === 0 && (
              <div className="mb-4 rounded-card border border-divider bg-card px-5 py-4 text-sm text-muted">
                {t.strat.savingsSame}
              </div>
            )}

            {/* Debt list */}
            <div className="flex flex-col gap-3">
              {debts.map((d) => (
                <DebtRow
                  key={d.id}
                  debt={d}
                  currency={currency}
                  rateLabel={rateLabel}
                  strings={strings}
                  winning={winning}
                  islamic={islamic}
                  onEdit={() => setEditing(d)}
                  onDelete={() => onDelete(d)}
                />
              ))}
            </div>
          </>
        )
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-bg shadow-md"
            role="status"
          >
            <span>{toast.message}</span>
            {toast.onUndo && (
              <button
                onClick={() => {
                  toast.onUndo?.();
                  setToasts((cur) => cur.filter((t) => t.id !== toast.id));
                }}
                className="font-semibold text-brand underline underline-offset-2"
              >
                {toast.undoLabel ?? strings.common.undo}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Strategy card ───────────────────────────────────────────────────────────
function StrategyCard({
  strings,
  currency,
  sim,
  keyName,
  isWinner,
}: {
  strings: ReturnType<typeof tByLang>;
  currency: string;
  sim: SimulationResult | null;
  keyName: "snowball" | "avalanche";
  isWinner: boolean;
}) {
  const t = strings.debts;
  return (
    <Card
      elevated
      className={cn(
        "relative",
        isWinner && "border-brand shadow-[0_1px_2px_rgba(200,85,61,.08),0_12px_32px_rgba(200,85,61,.1)]",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "inline-block rounded-pill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            keyName === "snowball"
              ? "bg-accent/15 text-accent"
              : "bg-brand/15 text-brand",
          )}
        >
          {t.primer[keyName].badge}
        </span>
        <h3 className="font-display text-lg">{t.strat[keyName]}</h3>
        {isWinner && (
          <span className="ml-auto inline-block rounded-pill bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:#FFF6EC]">
            {t.strat.winner}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t.strat.debtFree}
          </div>
          <div className="mt-0.5 font-display text-lg font-semibold tabular-nums">
            {sim ? formatDate(sim.debt_free_iso) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            &nbsp;
          </div>
          <div className="mt-0.5 font-display text-lg font-semibold tabular-nums">
            {sim ? fmt(t.strat.months, { n: sim.months }) : ""}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t.strat.totalInterest}
          </div>
          <div className="mt-0.5 font-display text-lg font-semibold tabular-nums">
            {sim ? fmoney(sim.total_interest_sen, { currency }) : "—"}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Debt row + collapsible amortization ─────────────────────────────────────
function DebtRow({
  debt,
  currency,
  rateLabel,
  strings,
  winning,
  islamic,
  onEdit,
  onDelete,
}: {
  debt: Debt;
  currency: string;
  rateLabel: string;
  strings: ReturnType<typeof tByLang>;
  winning: SimulationResult | null;
  islamic: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = strings.debts;
  const [showAmort, setShowAmort] = useState(false);
  const perDebt = winning?.perDebt.find((d) => d.id === debt.id);
  const sched = perDebt?.schedule ?? [];
  const first = sched.slice(0, 12);
  const last = sched.length > 24 ? sched.slice(-12) : sched.slice(12);
  // In Islamic mode, "interest" is really "profit" (markup, mudharabah share).
  // Same number; different framing.
  const interestLabel = islamic ? t.amortCols.profit : t.amortCols.interest;

  return (
    <div className="rounded-card border border-divider bg-surface px-4 py-3 sm:px-5 sm:py-4">
      {/* Top row: name + shariah pill + action icons on the right (always inline) */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{debt.name}</span>
            {islamic && (
              <span
                className="inline-block rounded-pill bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent"
                title={t.islamic.shariahPill}
                aria-label={t.islamic.shariahPill}
              >
                {t.islamic.shariahPill}
              </span>
            )}
          </div>
          <div className="text-xs text-muted">{t.types[debt.type] ?? debt.type}</div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-muted hover:text-brand"
            aria-label={strings.common.edit}
            title={strings.common.edit}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-muted hover:text-danger"
            aria-label={strings.common.delete}
            title={strings.common.delete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Stats — three columns on mobile too, but with smaller labels and
          balanced spacing. Desktop keeps the same look. */}
      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-divider pt-3 sm:mt-2 sm:gap-4 sm:border-t-0 sm:pt-0">
        <Stat label={t.row.balance} value={fmoney(debt.balance_sen, { currency })} />
        <Stat label={rateLabel} value={(debt.apr_bps / 100).toFixed(2) + "%"} />
        <Stat label={t.row.min} value={fmoney(debt.min_payment_sen, { currency })} />
      </div>
      {sched.length > 0 && (
        <>
          <button
            onClick={() => setShowAmort((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline hover:underline-offset-2"
          >
            {showAmort ? t.row.amortHide : t.row.amortToggle}
            {showAmort ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {showAmort && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-divider bg-bg">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-card">
                  <tr className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 text-left">{t.amortCols.month}</th>
                    <th className="px-3 py-2">{interestLabel}</th>
                    <th className="px-3 py-2">{t.amortCols.payment}</th>
                    <th className="px-3 py-2">{t.amortCols.balance}</th>
                  </tr>
                </thead>
                <tbody>
                  {first.map((r, i) => (
                    <tr key={"f" + i} className="border-t border-divider text-right tabular-nums">
                      <td className="px-3 py-1.5 text-left">{r.month}</td>
                      <td className="px-3 py-1.5">{fmoney(r.interest, { currency })}</td>
                      <td className="px-3 py-1.5">{fmoney(r.payment, { currency })}</td>
                      <td className="px-3 py-1.5">{fmoney(r.balance, { currency })}</td>
                    </tr>
                  ))}
                  {sched.length > 24 && (
                    <tr className="border-t border-divider bg-card">
                      <td colSpan={4} className="px-3 py-1.5 text-center text-xs text-muted">
                        … {sched.length - 24} more months …
                      </td>
                    </tr>
                  )}
                  {last.map((r, i) => (
                    <tr key={"l" + i} className="border-t border-divider text-right tabular-nums">
                      <td className="px-3 py-1.5 text-left">{r.month}</td>
                      <td className="px-3 py-1.5">{fmoney(r.interest, { currency })}</td>
                      <td className="px-3 py-1.5">{fmoney(r.payment, { currency })}</td>
                      <td className="px-3 py-1.5">{fmoney(r.balance, { currency })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-left sm:text-right">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

// ── Debt editor ─────────────────────────────────────────────────────────────
function DebtEditor({
  strings,
  islamic,
  currency,
  initial,
  onCancel,
  onSave,
}: {
  strings: ReturnType<typeof tByLang>;
  islamic: boolean;
  currency: string;
  initial: Debt | null;
  onCancel: () => void;
  onSave: (input: {
    name: string;
    type: DebtType;
    balance_sen: number;
    apr_bps: number;
    min_payment_sen: number;
  }) => void;
}) {
  const t = strings.debts;
  const ed = t.editor;
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<DebtType>(initial?.type ?? "credit");
  const [balance, setBalance] = useState(
    initial?.balance_sen ? (initial.balance_sen / 100).toFixed(2) : "",
  );
  const [apr, setApr] = useState(
    initial?.apr_bps != null ? (initial.apr_bps / 100).toString() : "",
  );
  const [min, setMin] = useState(
    initial?.min_payment_sen ? (initial.min_payment_sen / 100).toFixed(2) : "",
  );

  const bal_sen = pmoney(balance);
  const apr_num = Number(apr);
  const apr_bps = Number.isFinite(apr_num) ? Math.round(apr_num * 100) : NaN;
  const min_sen = pmoney(min);
  const valid =
    !!name.trim() &&
    bal_sen != null &&
    bal_sen > 0 &&
    Number.isFinite(apr_bps) &&
    apr_bps >= 0 &&
    min_sen != null &&
    min_sen > 0;

  const save = () => {
    if (!valid || bal_sen == null || min_sen == null) return;
    onSave({
      name: name.trim(),
      type,
      balance_sen: bal_sen,
      apr_bps,
      min_payment_sen: min_sen,
    });
  };
  const sym = currencySymbol(currency);
  const rateLabel = islamic ? t.islamic.profitRate : t.islamic.apr;

  return (
    <Card elevated className="mb-4">
      <h3 className="mb-4 font-display text-lg">
        {initial ? ed.titleEdit : ed.titleNew}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={ed.name}>
          <TextInput
            placeholder={ed.namePh}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            autoFocus
          />
        </Field>
        <Field label={ed.type}>
          <Select value={type} onChange={(ev) => setType(ev.target.value as DebtType)}>
            {DEBT_TYPES.map((k) => (
              <option key={k} value={k}>
                {t.types[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label={ed.balance}>
          <MoneyInput
            prefix={sym}
            value={balance}
            onChange={(ev) => setBalance(ev.target.value)}
          />
        </Field>
        <Field label={rateLabel} hint={ed.aprHint}>
          <MoneyInput
            prefix="%"
            value={apr}
            onChange={(ev) => setApr(ev.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label={ed.min}>
          <MoneyInput
            prefix={sym}
            value={min}
            onChange={(ev) => setMin(ev.target.value)}
          />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {strings.common.cancel}
        </Button>
        <Button onClick={save} disabled={!valid}>
          {strings.common.save}
        </Button>
      </div>
    </Card>
  );
}

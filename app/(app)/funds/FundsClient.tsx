"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { format as fmoney, currencySymbol, parse as pmoney } from "@/lib/money";
import { formatDate, todayIso } from "@/lib/dates";
import { fmt, t as tByLang, type Language } from "@/lib/i18n";
import { computeFundState, FUND_ICONS, type Fund } from "@/lib/funds";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, MoneyInput, Select, TextInput } from "@/components/ui/field";
import { FundIconGlyph } from "@/components/ui/FundIconGlyph";
import { cn } from "@/lib/utils";
import {
  addContribution,
  createFund,
  deleteFund as deleteFundAction,
  removeContribution,
  restoreFund,
  updateFund as updateFundAction,
} from "./actions";

interface Cat {
  id: string;
  name: string;
  bucket: "needs" | "wants" | "savings";
  archived: boolean;
}
interface Txn {
  id: string;
  amount_sen: number;
  category_id: string | null;
  date: string;
}
interface Toast {
  id: string;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
}

export function FundsClient({
  language,
  currency,
  initialFunds,
  categories,
  transactions,
}: {
  language: Language;
  currency: string;
  initialFunds: Fund[];
  categories: Cat[];
  transactions: Txn[];
}) {
  const strings = tByLang(language);
  const t = strings.funds;

  const [funds, setFunds] = useState<Fund[]>(initialFunds);
  const [editing, setEditing] = useState<null | "new" | Fund>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

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
        .channel(`funds-live-${userId}-${Math.random().toString(36).slice(2)}`)
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

  const pushToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { id, ...toast }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 5000);
  };

  const totals = useMemo(() => {
    let saved = 0;
    let target = 0;
    for (const f of funds) {
      const s = computeFundState(f, transactions);
      saved += s.saved_sen;
      target += f.target_sen ?? 0;
    }
    return { saved, target, count: funds.length };
  }, [funds, transactions]);

  const onCreate = (input: {
    name: string;
    target_sen: number;
    target_date: string;
    icon: string;
    linked_category_id: string | null;
  }) => {
    startTransition(async () => {
      try {
        await createFund(input);
        setEditing(null);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onUpdate = (id: string, input: {
    name: string;
    target_sen: number;
    target_date: string;
    icon: string;
    linked_category_id: string | null;
  }) => {
    setFunds((cur) => cur.map((f) => (f.id === id ? { ...f, ...input } : f)));
    setEditing(null);
    startTransition(async () => {
      try {
        await updateFundAction(id, input);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onDelete = (fund: Fund) => {
    if (!confirm(t.confirmDelete)) return;
    setFunds((cur) => cur.filter((f) => f.id !== fund.id));
    pushToast({
      message: t.deletedToast,
      undoLabel: strings.common.undo,
      onUndo: () => {
        setFunds((cur) => (cur.some((f) => f.id === fund.id) ? cur : [fund, ...cur]));
        startTransition(async () => {
          try {
            await restoreFund({
              id: fund.id,
              name: fund.name,
              target_sen: fund.target_sen,
              target_date: fund.target_date,
              icon: fund.icon,
              linked_category_id: fund.linked_category_id,
              contributions: fund.contributions ?? [],
              created_at: fund.created_at,
            });
          } catch {
            /* ignore — user re-tries manually if needed */
          }
        });
      },
    });
    startTransition(async () => {
      try {
        await deleteFundAction(fund.id);
      } catch (e) {
        setFunds((cur) => (cur.some((f) => f.id === fund.id) ? cur : [fund, ...cur]));
        pushToast({ message: e instanceof Error ? e.message : "Delete failed" });
      }
    });
  };

  const onAddContrib = (fundId: string, contrib: { date: string; amount_sen: number }) => {
    // Optimistic — Realtime UPDATE reconciles.
    setFunds((cur) =>
      cur.map((f) =>
        f.id === fundId
          ? { ...f, contributions: [...(f.contributions ?? []), contrib] }
          : f,
      ),
    );
    startTransition(async () => {
      try {
        await addContribution(fundId, contrib);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onRemoveContrib = (fundId: string, index: number) => {
    setFunds((cur) =>
      cur.map((f) =>
        f.id === fundId
          ? { ...f, contributions: (f.contributions ?? []).filter((_, i) => i !== index) }
          : f,
      ),
    );
    startTransition(async () => {
      try {
        await removeContribution(fundId, index);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const isEmpty = funds.length === 0 && !editing;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl">{t.title}</h1>
        {!editing && !isEmpty && (
          <Button onClick={() => setEditing("new")}>{t.new}</Button>
        )}
      </div>

      {editing && (
        <FundEditor
          key={editing === "new" ? "new" : editing.id}
          strings={strings}
          categories={categories}
          currency={currency}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(input) =>
            editing === "new" ? onCreate(input) : onUpdate(editing.id, input)
          }
        />
      )}

      {!editing && !isEmpty && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-card border border-divider bg-card px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t.totals.totalSaved}
            </div>
            <div className="mt-1 font-display text-xl font-semibold tabular-nums">
              {fmoney(totals.saved, { currency })}
            </div>
          </div>
          <div className="rounded-card border border-divider bg-card px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t.totals.totalTarget}
            </div>
            <div className="mt-1 font-display text-xl font-semibold tabular-nums">
              {fmoney(totals.target, { currency })}
            </div>
          </div>
          <div className="rounded-card border border-divider bg-card px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t.totals.activeFunds}
            </div>
            <div className="mt-1 font-display text-xl font-semibold tabular-nums">
              {totals.count}
            </div>
          </div>
        </div>
      )}

      {isEmpty ? (
        <Card elevated className="py-12 text-center">
          <div className="mx-auto mb-4 h-24 w-24 text-muted opacity-70">
            <FundIconGlyph name="piggy" size={72} />
          </div>
          <h3 className="mb-2 font-display text-xl">{t.empty.title}</h3>
          <p className="mx-auto mb-5 max-w-md text-muted">{t.empty.note}</p>
          <Button onClick={() => setEditing("new")}>{t.empty.cta}</Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {funds.map((f) => (
            <FundCard
              key={f.id}
              fund={f}
              transactions={transactions}
              categories={categories}
              currency={currency}
              strings={strings}
              onEdit={() => setEditing(f)}
              onDelete={() => onDelete(f)}
              onAddContrib={(c) => onAddContrib(f.id, c)}
              onRemoveContrib={(i) => onRemoveContrib(f.id, i)}
            />
          ))}
        </div>
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

// ── Editor ──────────────────────────────────────────────────────────────────
function FundEditor({
  strings,
  categories,
  currency,
  initial,
  onCancel,
  onSave,
}: {
  strings: ReturnType<typeof tByLang>;
  categories: Cat[];
  currency: string;
  initial: Fund | null;
  onCancel: () => void;
  onSave: (input: {
    name: string;
    target_sen: number;
    target_date: string;
    icon: string;
    linked_category_id: string | null;
  }) => void;
}) {
  const ed = strings.funds.editor;
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(
    initial?.target_sen ? (initial.target_sen / 100).toFixed(2) : "",
  );
  const [date, setDate] = useState(
    initial?.target_date ??
      new Date(
        new Date().getFullYear() + 1,
        new Date().getMonth(),
        new Date().getDate(),
      )
        .toISOString()
        .slice(0, 10),
  );
  const [icon, setIcon] = useState<string>((initial?.icon as string) ?? "piggy");
  const [linked, setLinked] = useState<string>(initial?.linked_category_id ?? "");

  const target_sen = pmoney(amount);
  const valid = !!name.trim() && !!target_sen && target_sen > 0 && !!date;

  const save = () => {
    if (!valid || !target_sen) return;
    onSave({
      name: name.trim(),
      target_sen,
      target_date: date,
      icon,
      linked_category_id: linked || null,
    });
  };
  const sym = currencySymbol(currency);

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
        <Field label={ed.target}>
          <MoneyInput
            prefix={sym}
            placeholder={ed.targetPh}
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label={ed.date}>
          <TextInput
            type="date"
            value={date}
            onChange={(ev) => setDate(ev.target.value)}
          />
        </Field>
        <Field label={ed.linked}>
          <Select value={linked} onChange={(ev) => setLinked(ev.target.value)}>
            <option value="">{ed.linkedNone}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold">{ed.icon}</div>
        <div className="flex flex-wrap gap-1.5">
          {FUND_ICONS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={icon === k}
              onClick={() => setIcon(k)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                icon === k
                  ? "border-brand bg-brand text-[color:#FFF6EC]"
                  : "border-divider bg-surface text-muted hover:border-brand hover:text-ink",
              )}
            >
              <FundIconGlyph name={k} size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {strings.common.cancel}
        </Button>
        <Button onClick={save} disabled={!valid}>
          {strings.common.save}
        </Button>
      </div>
      {/* isPending is owned by the parent FundsClient; the editor delegates
          save via onSave, so the whole card just visually stays clickable —
          the parent's toast surface reports errors if anything fails. */}
    </Card>
  );
}

// ── Fund card ───────────────────────────────────────────────────────────────
function FundCard({
  fund,
  transactions,
  categories,
  currency,
  strings,
  onEdit,
  onDelete,
  onAddContrib,
  onRemoveContrib,
}: {
  fund: Fund;
  transactions: Txn[];
  categories: Cat[];
  currency: string;
  strings: ReturnType<typeof tByLang>;
  onEdit: () => void;
  onDelete: () => void;
  onAddContrib: (c: { date: string; amount_sen: number }) => void;
  onRemoveContrib: (index: number) => void;
}) {
  const t = strings.funds;
  const s = computeFundState(fund, transactions);
  const linkedCat = fund.linked_category_id
    ? categories.find((c) => c.id === fund.linked_category_id)
    : null;

  const [logOpen, setLogOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [dt, setDt] = useState(todayIso());

  const commitContrib = () => {
    const sen = pmoney(amt);
    if (sen === null || sen <= 0) return;
    onAddContrib({ date: dt, amount_sen: sen });
    setAmt("");
  };
  const sym = currencySymbol(currency);

  return (
    <Card elevated>
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-divider bg-surface text-brand">
          <FundIconGlyph name={fund.icon} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-ink">{fund.name}</h3>
          <div className="text-sm text-muted">
            {formatDate(fund.target_date)}
            {linkedCat ? ` · ${linkedCat.name}` : ""}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1 text-muted hover:text-brand"
            aria-label={strings.common.edit}
            title={strings.common.edit}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-muted hover:text-danger"
            aria-label={strings.common.delete}
            title={strings.common.delete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="my-2 h-2 overflow-hidden rounded-pill bg-divider">
        <div
          className={cn(
            "h-full rounded-pill transition-all duration-300",
            s.status === "behind" ? "bg-warning" : "bg-accent",
          )}
          style={{ width: `${s.actual_pct}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between tabular-nums">
        <span className="font-bold text-ink">
          {fmoney(s.saved_sen, { currency })}
        </span>
        <span className="text-sm text-muted">
          / {fmoney(fund.target_sen, { currency })}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-divider pt-3">
        <Stat
          label={t.stats.required}
          value={s.done ? "—" : fmoney(s.required_monthly_sen, { currency })}
        />
        <Stat
          label={t.stats.toGo}
          value={fmoney(s.remaining_sen, { currency })}
        />
        <Stat
          label={t.stats.projected}
          value={s.projected_iso ? formatDate(s.projected_iso) : "—"}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-pill px-3 py-1 text-xs font-semibold",
            s.status === "behind" && "bg-warning/20 text-warning",
            s.status === "ontrack" && "bg-accent/15 text-accent",
            s.status === "ahead" && "bg-accent/15 text-accent",
            s.status === "done" && "bg-brand/15 text-brand",
          )}
        >
          {s.status === "done"
            ? t.status.done
            : s.status === "behind"
              ? t.status.behind
              : s.status === "ahead"
                ? t.status.ahead
                : t.status.onTrack}
        </span>
        <button
          onClick={() => setLogOpen((v) => !v)}
          className="ml-auto rounded-lg border border-divider px-3 py-1 text-sm font-semibold text-muted hover:bg-card hover:text-ink"
        >
          {t.log.toggle}
        </button>
      </div>

      {logOpen && (
        <div className="mt-4 rounded-lg border border-divider bg-card px-3 py-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {t.log.title}
          </div>
          {(fund.contributions ?? []).length === 0 ? (
            <p className="text-sm text-muted">{t.log.emptyLog}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm tabular-nums">
              {(fund.contributions ?? []).slice().reverse().map((c, i) => {
                const realIdx = (fund.contributions?.length ?? 0) - 1 - i;
                return (
                  <li
                    key={realIdx}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted">{formatDate(c.date)}</span>
                    <span className="flex items-center gap-2">
                      {fmoney(c.amount_sen, { currency })}
                      <button
                        onClick={() => onRemoveContrib(realIdx)}
                        className="rounded px-1 text-muted hover:text-danger"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {linkedCat && s.linkedCount > 0 && (
            <div className="mt-3 text-xs text-muted">
              {fmt(t.log.totalLinked, { name: linkedCat.name })}:{" "}
              {fmoney(s.linked_sen, { currency })} ({s.linkedCount})
            </div>
          )}
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <TextInput type="date" value={dt} onChange={(ev) => setDt(ev.target.value)} />
            <MoneyInput
              prefix={sym}
              placeholder={sym + " 0.00"}
              value={amt}
              onChange={(ev) => setAmt(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  commitContrib();
                }
              }}
              aria-label={t.log.addPh}
            />
            <Button onClick={commitContrib} disabled={!pmoney(amt)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

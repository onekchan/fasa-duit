"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarClock,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { currencySymbol, format as fmoney, parse as pmoney } from "@/lib/money";
import { formatDate, todayIso } from "@/lib/dates";
import { t as tByLang, type Language } from "@/lib/i18n";
import {
  asSchedule,
  asTemplate,
  describeSchedule,
  firstMonthlyRun,
  type MonthlySchedule,
  type RecurringTemplate,
} from "@/lib/recurring";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, MoneyInput, Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase";
import {
  createRecurring,
  deleteRecurring,
  postRecurringNow,
  setRecurringArchived,
  setRecurringAutoPost,
  updateRecurring,
} from "./actions";

type Row = Tables<"recurring">;
type Cat = { id: string; name: string; bucket: "needs" | "wants" | "savings"; archived: boolean };
type Acct = { id: string; name: string; archived: boolean };

interface Toast {
  id: string;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
}

export function RecurringClient({
  language,
  currency,
  initialRows,
  categories,
  accounts,
}: {
  language: Language;
  currency: string;
  initialRows: Row[];
  categories: Cat[];
  accounts: Acct[];
}) {
  const strings = tByLang(language);
  const t = strings.recurring;

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editing, setEditing] = useState<null | "new" | Row>(null);
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
        .channel(`recurring-live-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "recurring",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setRows((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Row;
                if (prev.some((r) => r.id === next.id)) return prev;
                return [next, ...prev].sort((a, b) => a.next_run.localeCompare(b.next_run));
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Row;
                return prev
                  .map((r) => (r.id === next.id ? next : r))
                  .sort((a, b) => a.next_run.localeCompare(b.next_run));
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
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 5000);
  };

  // ── Groupings ─────────────────────────────────────────────────────────────
  const today = todayIso();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Iso = in7.toISOString().slice(0, 10);

  const dueSoon = rows.filter(
    (r) => !r.archived && r.next_run <= in7Iso && r.next_run >= today,
  );
  const overdue = rows.filter((r) => !r.archived && r.next_run < today);
  const active = rows.filter((r) => !r.archived);
  const paused = rows.filter((r) => r.archived);

  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const r of active) {
      const tpl = asTemplate(r.template);
      if (tpl.amount_sen >= 0) inc += tpl.amount_sen;
      else exp += -tpl.amount_sen;
    }
    return { inc, exp, net: inc - exp, count: active.length };
  }, [active]);

  const onCreate = (input: EditorInput) => {
    startTransition(async () => {
      try {
        await createRecurring({
          name: input.name,
          scheduleDay: input.day,
          autoPost: input.autoPost,
          template: input.template,
        });
        setEditing(null);
        pushToast({ message: t.savedToast });
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onUpdate = (id: string, input: EditorInput) => {
    startTransition(async () => {
      try {
        await updateRecurring(id, {
          name: input.name,
          scheduleDay: input.day,
          autoPost: input.autoPost,
          template: input.template,
        });
        setEditing(null);
        pushToast({ message: t.savedToast });
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onDelete = (row: Row) => {
    if (!confirm(t.confirmDelete)) return;
    setRows((cur) => cur.filter((r) => r.id !== row.id));
    startTransition(async () => {
      try {
        await deleteRecurring(row.id);
        pushToast({ message: t.deletedToast });
      } catch (e) {
        setRows((cur) => (cur.some((r) => r.id === row.id) ? cur : [row, ...cur]));
        pushToast({ message: e instanceof Error ? e.message : "Delete failed" });
      }
    });
  };

  const onTogglePause = (row: Row) => {
    const next = !row.archived;
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, archived: next } : r)));
    startTransition(async () => {
      try {
        await setRecurringArchived(row.id, next);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onToggleAuto = (row: Row) => {
    const next = !row.auto_post;
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, auto_post: next } : r)));
    startTransition(async () => {
      try {
        await setRecurringAutoPost(row.id, next);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Save failed" });
      }
    });
  };

  const onPostNow = (row: Row) => {
    startTransition(async () => {
      try {
        await postRecurringNow(row.id);
        pushToast({ message: t.postedToast });
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : "Post failed" });
      }
    });
  };

  const isEmpty = rows.length === 0 && !editing;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{t.title}</h1>
          <p className="text-sm text-muted">{t.subhead}</p>
        </div>
        {!editing && !isEmpty && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            {t.new}
          </Button>
        )}
      </div>

      {editing && (
        <RecurringEditor
          key={editing === "new" ? "new" : editing.id}
          strings={strings}
          currency={currency}
          categories={categories}
          accounts={accounts}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(input) =>
            editing === "new" ? onCreate(input) : onUpdate(editing.id, input)
          }
        />
      )}

      {!editing && !isEmpty && (
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <StatCard label={t.totals.count} value={String(totals.count)} />
          <StatCard label={t.totals.income} value={fmoney(totals.inc, { currency })} tone="accent" />
          <StatCard label={t.totals.expense} value={fmoney(totals.exp, { currency })} tone="danger" />
          <StatCard label={t.totals.net} value={fmoney(totals.net, { currency })} tone={totals.net >= 0 ? "accent" : "danger"} />
        </div>
      )}

      {isEmpty ? (
        <Card elevated className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Repeat className="h-7 w-7" />
          </div>
          <h3 className="mb-2 font-display text-xl">{t.empty.title}</h3>
          <p className="mx-auto mb-5 max-w-md text-muted">{t.empty.note}</p>
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            {t.empty.cta}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6">
          {(overdue.length > 0 || dueSoon.length > 0) && (
            <section>
              <SectionHeader
                icon={<Zap className="h-4 w-4" />}
                label={t.sections.dueSoon}
                tone="warning"
              />
              <div className="grid gap-2">
                {[...overdue, ...dueSoon].map((r) => (
                  <RecurringRow
                    key={r.id}
                    row={r}
                    currency={currency}
                    accounts={accounts}
                    categories={categories}
                    strings={strings}
                    highlight
                    onPostNow={() => onPostNow(r)}
                    onEdit={() => setEditing(r)}
                    onDelete={() => onDelete(r)}
                    onTogglePause={() => onTogglePause(r)}
                    onToggleAuto={() => onToggleAuto(r)}
                  />
                ))}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <section>
              <SectionHeader
                icon={<CalendarClock className="h-4 w-4" />}
                label={t.sections.active}
              />
              <div className="grid gap-2">
                {active
                  .filter((r) => !dueSoon.some((d) => d.id === r.id) && !overdue.some((o) => o.id === r.id))
                  .map((r) => (
                    <RecurringRow
                      key={r.id}
                      row={r}
                      currency={currency}
                      accounts={accounts}
                      categories={categories}
                      strings={strings}
                      onPostNow={() => onPostNow(r)}
                      onEdit={() => setEditing(r)}
                      onDelete={() => onDelete(r)}
                      onTogglePause={() => onTogglePause(r)}
                      onToggleAuto={() => onToggleAuto(r)}
                    />
                  ))}
              </div>
            </section>
          )}

          {paused.length > 0 && (
            <section>
              <SectionHeader
                icon={<Pause className="h-4 w-4" />}
                label={t.sections.paused}
                tone="muted"
              />
              <div className="grid gap-2 opacity-70">
                {paused.map((r) => (
                  <RecurringRow
                    key={r.id}
                    row={r}
                    currency={currency}
                    accounts={accounts}
                    categories={categories}
                    strings={strings}
                    onPostNow={() => onPostNow(r)}
                    onEdit={() => setEditing(r)}
                    onDelete={() => onDelete(r)}
                    onTogglePause={() => onTogglePause(r)}
                    onToggleAuto={() => onToggleAuto(r)}
                  />
                ))}
              </div>
            </section>
          )}
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
                  setToasts((cur) => cur.filter((x) => x.id !== toast.id));
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

// ── Small building blocks ─────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "danger";
}) {
  return (
    <div className="rounded-card border border-divider bg-card px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-xl font-semibold tabular-nums",
          tone === "accent" && "text-accent",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "warning" | "muted";
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
        tone === "warning" && "text-warning",
        tone === "muted" && "text-muted",
        !tone && "text-muted",
      )}
    >
      {icon}
      {label}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function RecurringRow({
  row,
  currency,
  accounts,
  categories,
  strings,
  highlight,
  onPostNow,
  onEdit,
  onDelete,
  onTogglePause,
  onToggleAuto,
}: {
  row: Row;
  currency: string;
  accounts: Acct[];
  categories: Cat[];
  strings: ReturnType<typeof tByLang>;
  highlight?: boolean;
  onPostNow: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
  onToggleAuto: () => void;
}) {
  const t = strings.recurring;
  const tpl = asTemplate(row.template);
  const sched = asSchedule(row.schedule);
  const cat = categories.find((c) => c.id === tpl.category_id);
  const acct = accounts.find((a) => a.id === tpl.account_id);
  const isIncome = tpl.amount_sen >= 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-divider bg-surface p-4 transition sm:flex-row sm:items-center",
        highlight && "border-warning/40 bg-warning/5",
      )}
    >
      {/* Left: name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-lg font-semibold text-ink">
            {row.name}
          </span>
          {!row.auto_post && (
            <span className="rounded-pill border border-divider bg-card px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
              {t.badges.manual}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-sm text-muted">
          {describeSchedule(sched, strings === tByLang("ms") ? "ms" : "en")}
          {" · "}
          <span className={cn(row.next_run < todayIso() && "text-warning font-semibold")}>
            {t.nextOn.replace("{date}", formatDate(row.next_run))}
          </span>
          {cat ? ` · ${cat.name}` : ""}
          {acct ? ` · ${acct.name}` : ""}
        </div>
      </div>

      {/* Middle: amount */}
      <div
        className={cn(
          "shrink-0 text-right font-display text-lg font-semibold tabular-nums sm:min-w-[130px]",
          isIncome ? "text-accent" : "text-ink",
        )}
      >
        {isIncome ? "+ " : "− "}
        {fmoney(Math.abs(tpl.amount_sen), { currency })}
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1">
        <IconBtn
          onClick={onPostNow}
          label={t.actions.postNow}
          tone="brand"
          icon={<Send className="h-4 w-4" />}
        />
        <IconBtn
          onClick={onToggleAuto}
          label={row.auto_post ? t.actions.setManual : t.actions.setAuto}
          icon={<Zap className={cn("h-4 w-4", row.auto_post ? "text-warning" : "")} />}
        />
        <IconBtn
          onClick={onTogglePause}
          label={row.archived ? t.actions.resume : t.actions.pause}
          icon={
            row.archived ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />
          }
        />
        <IconBtn onClick={onEdit} label={strings.common.edit} icon={<Pencil className="h-4 w-4" />} />
        <IconBtn
          onClick={onDelete}
          label={strings.common.delete}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  icon,
  tone,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  tone?: "brand" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted transition",
        "hover:border-divider hover:bg-card",
        tone === "brand" && "hover:text-brand",
        tone === "danger" && "hover:text-danger",
      )}
    >
      {icon}
    </button>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────
type EditorInput = {
  name: string;
  day: number;
  autoPost: boolean;
  template: RecurringTemplate;
};

function RecurringEditor({
  strings,
  currency,
  categories,
  accounts,
  initial,
  onCancel,
  onSave,
}: {
  strings: ReturnType<typeof tByLang>;
  currency: string;
  categories: Cat[];
  accounts: Acct[];
  initial: Row | null;
  onCancel: () => void;
  onSave: (input: EditorInput) => void;
}) {
  const t = strings.recurring;
  const ed = t.editor;
  const initialTpl: RecurringTemplate = initial
    ? asTemplate(initial.template)
    : {
        amount_sen: 0,
        account_id: accounts[0]?.id ?? null,
        category_id: null,
        merchant: "",
        notes: "",
        tags: [],
      };
  const initialSched: MonthlySchedule = initial
    ? asSchedule(initial.schedule)
    : { freq: "monthly", day: Number(todayIso().slice(-2)) };

  const [name, setName] = useState(initial?.name ?? "");
  const [day, setDay] = useState(String(initialSched.day));
  const [autoPost, setAutoPost] = useState(initial?.auto_post ?? true);
  const [flow, setFlow] = useState<"expense" | "income">(
    initialTpl.amount_sen > 0 ? "income" : "expense",
  );
  const [amount, setAmount] = useState(
    initialTpl.amount_sen ? (Math.abs(initialTpl.amount_sen) / 100).toFixed(2) : "",
  );
  const [accountId, setAccountId] = useState(initialTpl.account_id ?? "");
  const [categoryId, setCategoryId] = useState(initialTpl.category_id ?? "");
  const [merchant, setMerchant] = useState(initialTpl.merchant ?? "");
  const [notes, setNotes] = useState(initialTpl.notes ?? "");

  const amtSen = pmoney(amount);
  const dayNum = Number(day);
  const valid =
    !!name.trim() &&
    amtSen !== null &&
    amtSen > 0 &&
    Number.isInteger(dayNum) &&
    dayNum >= 1 &&
    dayNum <= 31;

  const save = () => {
    if (!valid || amtSen === null) return;
    const signed = flow === "income" ? amtSen : -amtSen;
    onSave({
      name: name.trim(),
      day: dayNum,
      autoPost,
      template: {
        amount_sen: signed,
        account_id: accountId || null,
        category_id: categoryId || null,
        merchant: merchant.trim(),
        notes: notes.trim(),
        tags: [],
      },
    });
  };

  const sym = currencySymbol(currency);
  const previewNext = firstMonthlyRun(
    Number.isFinite(dayNum) ? Math.min(31, Math.max(1, dayNum)) : 1,
    todayIso(),
  );

  return (
    <Card elevated className="mb-4">
      <h3 className="mb-4 font-display text-lg">
        {initial ? ed.titleEdit : ed.titleNew}
      </h3>

      {/* Flow toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-divider bg-card p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setFlow("expense")}
          className={cn(
            "rounded-md px-3 py-1.5 transition",
            flow === "expense" ? "bg-surface text-ink shadow-sm" : "text-muted",
          )}
        >
          {strings.txn.expense}
        </button>
        <button
          type="button"
          onClick={() => setFlow("income")}
          className={cn(
            "rounded-md px-3 py-1.5 transition",
            flow === "income" ? "bg-surface text-ink shadow-sm" : "text-muted",
          )}
        >
          {strings.txn.income}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={ed.name} hint={ed.nameHint}>
          <TextInput
            placeholder={ed.namePh}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            autoFocus
          />
        </Field>
        <Field label={ed.amount}>
          <MoneyInput
            prefix={sym}
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label={ed.day} hint={ed.dayHint}>
          <TextInput
            type="number"
            min={1}
            max={31}
            step={1}
            value={day}
            onChange={(ev) => setDay(ev.target.value)}
          />
        </Field>
        <Field label={ed.merchant}>
          <TextInput
            placeholder={ed.merchantPh}
            value={merchant}
            onChange={(ev) => setMerchant(ev.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label={strings.txn.account}>
          <Select value={accountId} onChange={(ev) => setAccountId(ev.target.value)}>
            <option value="">{strings.txn.chooseAccount}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={strings.txn.category}>
          <Select value={categoryId} onChange={(ev) => setCategoryId(ev.target.value)}>
            <option value="">{strings.txn.chooseCategory}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-3">
        <Field label={ed.notes}>
          <TextInput
            placeholder={ed.notesPh}
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
          />
        </Field>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-divider bg-card px-4 py-3">
        <input
          type="checkbox"
          checked={autoPost}
          onChange={(ev) => setAutoPost(ev.target.checked)}
          className="mt-1 h-4 w-4 accent-brand"
        />
        <div>
          <div className="text-sm font-semibold text-ink">{ed.autoPost}</div>
          <div className="text-xs text-muted">{ed.autoPostHint}</div>
        </div>
      </label>

      <div className="mt-4 rounded-lg border border-divider bg-surface px-4 py-3 text-sm text-muted">
        {ed.previewNext.replace("{date}", formatDate(previewNext))}
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

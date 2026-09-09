"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus, Paperclip, X, Search, Trash2, Pencil } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { format as fmoney, parse as pmoney, currencySymbol } from "@/lib/money";
import { formatDate, todayIso } from "@/lib/dates";
import { fmt, t as tByLang, type Language } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyInput, Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  addTransaction,
  deleteTransaction,
  getReceiptUrl,
  loadSampleMonth,
  restoreTransaction,
  updateTransaction,
} from "./actions";

interface Txn {
  id: string;
  user_id: string;
  date: string;
  amount_sen: number;
  account_id: string | null;
  category_id: string | null;
  merchant: string | null;
  notes: string | null;
  tags: string[] | null;
  receipt_path: string | null;
  created_at?: string;
  updated_at?: string;
}
interface Cat { id: string; name: string; bucket: "needs" | "wants" | "savings"; archived: boolean }
interface Acct { id: string; name: string; type: string; archived: boolean }

interface Toast {
  id: string;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
}

export function TransactionsClient({
  currency,
  language,
  initialTransactions,
  categories,
  accounts,
  initialQuery = "",
  initialCategoryFilter = "",
}: {
  currency: string;
  language: Language;
  initialTransactions: Txn[];
  categories: Cat[];
  accounts: Acct[];
  initialQuery?: string;
  initialCategoryFilter?: string;
}) {
  const strings = tByLang(language);
  const t = strings.txn;

  // Local mirror of the DB rows. Seeded from SSR data and kept in sync with
  // Supabase Realtime.
  const [rows, setRows] = useState<Txn[]>(initialTransactions);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Txn | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [accountFilter, setAccountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // ── Realtime: subscribe once, merge changes into `rows` ───────────────────
  // Uses a unique channel name per mount so React 19 Strict Mode's double
  // invocation doesn't collide with an already-subscribed channel of the
  // same name in Supabase's channel registry.
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    // Hold the channel in a ref so cleanup can remove it even if setup finished
    // after the effect's cleanup ran.
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const userId = data.user?.id;
      if (!userId) return;

      const channel = supabase
        .channel(`txn-live-${userId}-${Math.random().toString(36).slice(2)}`)
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
      // If we were cancelled while the auth fetch was in flight, tear down.
      if (cancelled) supabase.removeChannel(channel);
    });

    return () => {
      cancelled = true;
      if (channelRef) void supabase.removeChannel(channelRef);
    };
  }, []);

  // ── Keyboard shortcuts: `n` and `/` ──────────────────────────────────────
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement | null;
      const inField = el && /INPUT|TEXTAREA|SELECT/.test(el.tagName);
      if (inField) return;
      if (ev.key === "n") { ev.preventDefault(); setQuickAddOpen(true); }
      else if (ev.key === "/") { ev.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Filters + sort ───────────────────────────────────────────────────────
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const acctById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !accountFilter || r.account_id === accountFilter)
      .filter((r) => !categoryFilter || r.category_id === categoryFilter)
      .filter((r) => {
        if (!q) return true;
        const merch = (r.merchant ?? "").toLowerCase();
        const notes = (r.notes ?? "").toLowerCase();
        const tags = (r.tags ?? []).join(" ").toLowerCase();
        return merch.includes(q) || notes.includes(q) || tags.includes(q);
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [rows, query, accountFilter, categoryFilter]);

  // ── Toasts ───────────────────────────────────────────────────────────────
  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { id, ...toast }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 5000);
  }, []);
  const dismissToast = (id: string) => setToasts((cur) => cur.filter((t) => t.id !== id));

  // ── Actions ──────────────────────────────────────────────────────────────
  const onSave = (input: {
    date: string;
    amount_sen: number;
    account_id: string | null;
    category_id: string | null;
    merchant: string;
    notes: string;
    tags: string[];
    receipt_path: string | null;
  }) => {
    // Optimistic — Realtime will reconcile on the way back.
    const tempId = "temp-" + Math.random().toString(36).slice(2);
    setRows((cur) => [
      {
        id: tempId,
        user_id: "",
        ...input,
        tags: input.tags,
        receipt_path: input.receipt_path,
      },
      ...cur,
    ]);
    startTransition(async () => {
      try {
        await addTransaction(input);
        // Realtime INSERT will land the real row; clear the optimistic one.
        setRows((cur) => cur.filter((r) => r.id !== tempId));
      } catch (e) {
        setRows((cur) => cur.filter((r) => r.id !== tempId));
        pushToast({ message: e instanceof Error ? e.message : t.saveFailed });
      }
    });
  };

  const onUpdate = (id: string, input: {
    date: string;
    amount_sen: number;
    account_id: string | null;
    category_id: string | null;
    merchant: string;
    notes: string;
    tags: string[];
    receipt_path: string | null;
  }) => {
    // Optimistic merge — Realtime UPDATE will confirm.
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...input } : r)));
    setEditingRow(null);
    startTransition(async () => {
      try {
        await updateTransaction(id, input);
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : t.saveFailed });
      }
    });
  };

  const onDelete = (row: Txn) => {
    setRows((cur) => cur.filter((r) => r.id !== row.id));
    pushToast({
      message: t.deletedToast,
      undoLabel: strings.common.undo,
      onUndo: () => {
        setRows((cur) => (cur.some((r) => r.id === row.id) ? cur : [row, ...cur]));
        startTransition(async () => {
          try {
            await restoreTransaction(row);
          } catch {
            /* toast is already gone; if the restore fails Realtime won't help */
          }
        });
      },
    });
    startTransition(async () => {
      try {
        await deleteTransaction(row.id);
      } catch (e) {
        // Put it back and surface the error.
        setRows((cur) => (cur.some((r) => r.id === row.id) ? cur : [row, ...cur]));
        pushToast({ message: e instanceof Error ? e.message : t.saveFailed });
      }
    });
  };

  const onLoadSample = () => {
    startTransition(async () => {
      try {
        await loadSampleMonth();
      } catch (e) {
        pushToast({ message: e instanceof Error ? e.message : t.saveFailed });
      }
    });
  };

  const isEmpty = rows.length === 0 && !quickAddOpen;
  const anyFilter = !!(query || accountFilter || categoryFilter);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl">{t.title}</h1>
        {!quickAddOpen && (
          <Button onClick={() => setQuickAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> {t.quickAdd}
          </Button>
        )}
      </div>

      {quickAddOpen && !editingRow && (
        <QuickAdd
          strings={strings}
          categories={categories.filter((c) => !c.archived)}
          accounts={accounts.filter((a) => !a.archived)}
          currency={currency}
          onSave={onSave}
          onClose={() => setQuickAddOpen(false)}
        />
      )}
      {editingRow && (
        <QuickAdd
          key={editingRow.id}
          strings={strings}
          categories={categories}
          accounts={accounts}
          currency={currency}
          initial={editingRow}
          onSave={(input) => onUpdate(editingRow.id, input)}
          onClose={() => setEditingRow(null)}
        />
      )}

      {!isEmpty && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <TextInput
              ref={searchRef}
              type="search"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              className="w-full pl-9"
              aria-label={t.searchPlaceholder}
            />
          </div>
          <Select
            value={accountFilter}
            onChange={(ev) => setAccountFilter(ev.target.value)}
            aria-label={t.filterAllAccounts}
          >
            <option value="">{t.filterAllAccounts}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select
            value={categoryFilter}
            onChange={(ev) => setCategoryFilter(ev.target.value)}
            aria-label={t.filterAllCategories}
          >
            <option value="">{t.filterAllCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {anyFilter && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setAccountFilter("");
                setCategoryFilter("");
              }}
            >
              {t.clearFilters}
            </Button>
          )}
          <span className="ml-auto text-sm text-muted">
            {fmt(t.count, { n: filtered.length })}
          </span>
        </div>
      )}

      {isEmpty ? (
        <Card elevated className="py-12 text-center">
          <div className="mx-auto mb-4 h-24 w-24 text-muted opacity-70">
            <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth={2}
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 30h68v52a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V30z" />
              <path d="M14 30l6-14a4 4 0 0 1 3.6-2.3h48.8A4 4 0 0 1 76 16l6 14" />
              <path d="M30 46h36M30 58h24" />
            </svg>
          </div>
          <h3 className="mb-2 font-display text-xl">{t.emptyTitle}</h3>
          <p className="mx-auto mb-5 max-w-md text-muted">{t.emptyNote}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setQuickAddOpen(true)}>{t.addFirst}</Button>
            <Button variant="ghost" onClick={onLoadSample} disabled={isPending}>
              {t.addSample}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop table — hidden under md */}
          <div className="hidden overflow-x-auto rounded-card border border-divider bg-surface md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-card">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">{t.dateCol}</th>
                  <th className="px-4 py-3">{t.merchantCol}</th>
                  <th className="px-4 py-3">{t.categoryCol}</th>
                  <th className="px-4 py-3">{t.accountCol}</th>
                  <th className="px-4 py-3 text-right">{t.amountCol}</th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const income = r.amount_sen > 0;
                  const cat = r.category_id ? catById[r.category_id] : null;
                  const acct = r.account_id ? acctById[r.account_id] : null;
                  return (
                    <tr key={r.id} className="border-t border-divider hover:bg-card">
                      <td className="px-4 py-3">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{r.merchant || "—"}</span>
                          {(r.tags ?? []).includes("sample") && (
                            <span className="rounded-pill bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                              {t.sampleBadge}
                            </span>
                          )}
                          {r.receipt_path && <ReceiptLink path={r.receipt_path} label={t.viewReceipt} />}
                        </div>
                      </td>
                      <td className="px-4 py-3">{cat?.name ?? "—"}</td>
                      <td className="px-4 py-3">{acct?.name ?? "—"}</td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-semibold tabular-nums",
                          income ? "text-accent" : "text-ink",
                        )}
                      >
                        {(income ? "+" : "") + fmoney(r.amount_sen, { currency })}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingRow(r);
                              setQuickAddOpen(false);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="rounded p-1 text-muted transition-colors hover:text-brand"
                            aria-label={strings.common.edit ?? "Edit"}
                            title={strings.common.edit ?? "Edit"}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(r)}
                            className="rounded p-1 text-muted transition-colors hover:text-danger"
                            aria-label={strings.common.delete}
                            title={strings.common.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list — visible under md */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((r) => {
              const income = r.amount_sen > 0;
              const cat = r.category_id ? catById[r.category_id] : null;
              const acct = r.account_id ? acctById[r.account_id] : null;
              return (
                <div
                  key={r.id}
                  className="rounded-card border border-divider bg-surface px-4 py-3"
                >
                  {/* Top row: merchant + amount */}
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-ink">
                        {r.merchant || "—"}
                      </span>
                      {(r.tags ?? []).includes("sample") && (
                        <span className="shrink-0 rounded-pill bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                          {t.sampleBadge}
                        </span>
                      )}
                      {r.receipt_path && (
                        <span className="shrink-0">
                          <ReceiptLink path={r.receipt_path} label={t.viewReceipt} />
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-semibold tabular-nums",
                        income ? "text-accent" : "text-ink",
                      )}
                    >
                      {(income ? "+" : "") + fmoney(r.amount_sen, { currency })}
                    </span>
                  </div>
                  {/* Sub row: date · category · account + actions */}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs text-muted">
                      {formatDate(r.date)}
                      {cat?.name ? ` · ${cat.name}` : ""}
                      {acct?.name ? ` · ${acct.name}` : ""}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRow(r);
                          setQuickAddOpen(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="rounded p-1.5 text-muted transition-colors active:text-brand"
                        aria-label={strings.common.edit ?? "Edit"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(r)}
                        className="rounded p-1.5 text-muted transition-colors active:text-danger"
                        aria-label={strings.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Toast region */}
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
                  dismissToast(toast.id);
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

// ── QuickAdd / Edit form ────────────────────────────────────────────────────
function QuickAdd({
  strings,
  categories,
  accounts,
  currency,
  initial,
  onSave,
  onClose,
}: {
  strings: ReturnType<typeof tByLang>;
  categories: Cat[];
  accounts: Acct[];
  currency: string;
  initial?: Txn;
  onSave: (input: {
    date: string;
    amount_sen: number;
    account_id: string | null;
    category_id: string | null;
    merchant: string;
    notes: string;
    tags: string[];
    receipt_path: string | null;
  }) => void;
  onClose: () => void;
}) {
  const t = strings.txn;
  const isEdit = !!initial;
  const [type, setType] = useState<"expense" | "income">(
    initial ? (initial.amount_sen >= 0 ? "income" : "expense") : "expense",
  );
  const [amount, setAmount] = useState(
    initial ? (Math.abs(initial.amount_sen) / 100).toFixed(2) : "",
  );
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? "");
  const [accountId, setAccountId] = useState<string>(
    initial?.account_id ?? accounts[0]?.id ?? "",
  );
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceipt] = useState<string | null>(initial?.receipt_path ?? null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    amountRef.current?.focus();
    amountRef.current?.select();
  }, []);

  const sym = currencySymbol(currency);

  const save = async () => {
    const sen = pmoney(amount);
    if (sen === null || sen === 0) {
      amountRef.current?.focus();
      return;
    }
    const signed = type === "income" ? Math.abs(sen) : -Math.abs(sen);

    let receipt_path: string | null = existingReceipt;
    if (receiptFile) {
      setUploading(true);
      try {
        const supabase = createBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const ext = (receiptFile.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("receipts").upload(path, receiptFile);
        if (!up.error) receipt_path = path;
      } finally {
        setUploading(false);
      }
    }

    onSave({
      date: initial?.date ?? todayIso(),
      amount_sen: signed,
      account_id: accountId || null,
      category_id: categoryId || null,
      merchant: merchant.trim(),
      notes: initial?.notes ?? "",
      tags: initial?.tags ?? [],
      receipt_path,
    });

    // On add-mode: clear & reopen for the next entry. On edit-mode: parent closes.
    if (!isEdit) {
      setAmount("");
      setMerchant("");
      setReceiptFile(null);
      amountRef.current?.focus();
    }
  };

  const onKey = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void save();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      onClose();
    }
  };

  return (
    <Card className="mb-4" onKeyDown={onKey}>
      {isEdit && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">
          {t.editTitle}
        </div>
      )}
      <div className="flex flex-wrap items-stretch gap-2">
        {/* +/- toggle */}
        <div className="inline-flex overflow-hidden rounded-lg border border-divider bg-surface">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={cn(
              "px-3 text-sm font-semibold",
              type === "expense" ? "bg-card text-brand" : "text-muted",
            )}
            aria-pressed={type === "expense"}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={cn(
              "px-3 text-sm font-semibold",
              type === "income" ? "bg-card text-accent" : "text-muted",
            )}
            aria-pressed={type === "income"}
          >
            +
          </button>
        </div>
        <div className="min-w-[140px] flex-1">
          <MoneyInput
            ref={amountRef}
            prefix={sym}
            placeholder={sym + " 0.00"}
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            aria-label={t.amount}
            inputClassName="text-right"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(ev) => setCategoryId(ev.target.value)}
          aria-label={t.category}
          className="min-w-[130px] flex-1"
        >
          <option value="">{t.chooseCategory}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={accountId}
          onChange={(ev) => setAccountId(ev.target.value)}
          aria-label={t.account}
          className="min-w-[130px] flex-1"
        >
          <option value="">{t.chooseAccount}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <TextInput
          type="text"
          placeholder={t.merchant}
          value={merchant}
          onChange={(ev) => setMerchant(ev.target.value)}
          aria-label={t.merchant}
          className="min-w-[160px] flex-[2]"
        />
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-divider bg-surface px-3 text-sm font-medium text-muted hover:border-brand hover:text-ink">
          <Paperclip className="h-4 w-4" />
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(ev) => setReceiptFile(ev.target.files?.[0] ?? null)}
          />
          {receiptFile ? receiptFile.name.slice(0, 12) + "…" : t.receipt}
        </label>
        <Button type="button" onClick={() => void save()} disabled={uploading}>
          {uploading ? strings.common.saving : isEdit ? t.updateAction : t.quickAdd}
        </Button>
        <Button variant="ghost" type="button" onClick={onClose} aria-label={t.close}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 text-xs text-muted">{t.escHint}</div>
    </Card>
  );
}

// ── Receipt view link ───────────────────────────────────────────────────────
function ReceiptLink({ path, label }: { path: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const url = await getReceiptUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={open}
      disabled={loading}
      title={label}
      aria-label={label}
      className="text-muted hover:text-brand"
    >
      <Paperclip className="h-3.5 w-3.5" />
    </button>
  );
}

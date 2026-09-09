"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { currencySymbol, parse as pmoney } from "@/lib/money";
import { t as tByLang, type Language } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyInput, Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  createAccount,
  renameAccount,
  setAccountArchived,
  setAccountOpeningBalance,
  setAccountType,
} from "./accounts.actions";

type AccountType = "cash" | "current" | "savings" | "credit" | "ewallet" | "investment";
const TYPE_ORDER: AccountType[] = [
  "current",
  "savings",
  "credit",
  "ewallet",
  "cash",
  "investment",
];

interface Acct {
  id: string;
  name: string;
  type: AccountType;
  opening_balance_sen: number;
  currency: string;
  archived: boolean;
}

export function AccountsPanel({
  language,
  currency,
  initial,
}: {
  language: Language;
  currency: string;
  initial: Acct[];
}) {
  const strings = tByLang(language);
  const p = strings.settings.accts;

  const [rows, setRows] = useState<Acct[]>(initial);
  const [showArchived, setShowArchived] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<AccountType>("current");
  const [draftBalance, setDraftBalance] = useState("");
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
        .channel(`accts-live-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "accounts",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setRows((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Acct;
                if (prev.some((r) => r.id === next.id)) return prev;
                return [...prev, next];
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Acct;
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

  const grouped = useMemo(() => {
    const groups: Partial<Record<AccountType, Acct[]>> = {};
    for (const a of rows) {
      if (a.archived && !showArchived) continue;
      const key = (a.type ?? "cash") as AccountType;
      (groups[key] ??= []).push(a);
    }
    for (const k of Object.keys(groups) as AccountType[]) {
      groups[k]?.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [rows, showArchived]);

  const addAccount = () => {
    const name = draftName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await createAccount({
          name,
          type: draftType,
          opening_balance_sen: pmoney(draftBalance) ?? 0,
          currency,
        });
        setDraftName("");
        setDraftBalance("");
      } catch {
        /* Realtime handles success case */
      }
    });
  };

  const isEmpty = rows.length === 0;

  return (
    <Card elevated>
      <h3 className="mb-1 font-display text-lg">{p.title}</h3>
      <p className="mb-4 text-sm text-muted">{p.sub}</p>

      <div className="mb-2 flex justify-end">
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(ev) => setShowArchived(ev.target.checked)}
            className="accent-brand"
          />
          {p.showArchived}
        </label>
      </div>

      {isEmpty ? (
        <p className="text-muted">{p.empty}</p>
      ) : (
        <div>
          {TYPE_ORDER.filter((k) => (grouped[k]?.length ?? 0) > 0).map((type) => (
            <TypeGroup
              key={type}
              type={type}
              items={grouped[type] ?? []}
              label={p.types[type]}
              currency={currency}
              strings={strings}
            />
          ))}
        </div>
      )}

      {/* Add row */}
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2 rounded-lg border border-dashed border-divider bg-card p-3">
        <TextInput
          placeholder={p.addPlaceholder}
          value={draftName}
          onChange={(ev) => setDraftName(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              addAccount();
            }
          }}
        />
        <Select
          value={draftType}
          onChange={(ev) => setDraftType(ev.target.value as AccountType)}
          aria-label="Type"
        >
          {TYPE_ORDER.map((k) => (
            <option key={k} value={k}>
              {p.types[k]}
            </option>
          ))}
        </Select>
        <Button type="button" onClick={addAccount} disabled={!draftName.trim()}>
          {p.add}
        </Button>
      </div>
    </Card>
  );
}

function TypeGroup({
  items,
  label,
  currency,
  strings,
}: {
  type: AccountType;
  items: Acct[];
  label: string;
  currency: string;
  strings: ReturnType<typeof tByLang>;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 border-b border-divider pb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        <span className="ml-auto text-sm text-muted">{items.length}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((a) => (
          <AcctRow key={a.id} acct={a} currency={currency} strings={strings} />
        ))}
      </div>
    </div>
  );
}

function AcctRow({
  acct,
  currency,
  strings,
}: {
  acct: Acct;
  currency: string;
  strings: ReturnType<typeof tByLang>;
}) {
  const p = strings.settings.accts;
  const [name, setName] = useState(acct.name);
  const [bal, setBal] = useState(((acct.opening_balance_sen ?? 0) / 100).toFixed(2));
  const [, startTransition] = useTransition();

  useEffect(() => setName(acct.name), [acct.name]);
  useEffect(() => setBal(((acct.opening_balance_sen ?? 0) / 100).toFixed(2)), [
    acct.opening_balance_sen,
  ]);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === acct.name) {
      setName(acct.name);
      return;
    }
    startTransition(async () => {
      try {
        await renameAccount(acct.id, trimmed);
      } catch {
        setName(acct.name);
      }
    });
  };
  const commitBalance = () => {
    const sen = pmoney(bal);
    if (sen === null) {
      setBal(((acct.opening_balance_sen ?? 0) / 100).toFixed(2));
      return;
    }
    if (sen === acct.opening_balance_sen) {
      setBal((sen / 100).toFixed(2));
      return;
    }
    startTransition(async () => {
      try {
        await setAccountOpeningBalance(acct.id, String(sen / 100));
        setBal((sen / 100).toFixed(2));
      } catch {
        setBal(((acct.opening_balance_sen ?? 0) / 100).toFixed(2));
      }
    });
  };
  const commitType = (type: AccountType) => {
    startTransition(async () => {
      try {
        await setAccountType(acct.id, type);
      } catch {
        /* Realtime bounces back */
      }
    });
  };
  const toggleArchived = () => {
    startTransition(async () => {
      try {
        await setAccountArchived(acct.id, !acct.archived);
      } catch {
        /* Realtime bounces back */
      }
    });
  };

  const sym = currencySymbol(currency);

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-divider bg-surface px-3 py-2",
        acct.archived && "opacity-55",
      )}
    >
      <input
        type="text"
        value={name}
        onChange={(ev) => setName(ev.target.value)}
        onBlur={commitName}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") (ev.currentTarget as HTMLInputElement).blur();
        }}
        className="border-0 bg-transparent px-0 font-medium text-ink focus:rounded focus:bg-bg focus:px-2 focus:outline-none"
        aria-label="Account name"
      />
      <Select
        value={acct.type ?? "cash"}
        onChange={(ev) => commitType(ev.target.value as AccountType)}
        className="!py-1 !text-xs"
        aria-label="Type"
      >
        {TYPE_ORDER.map((k) => (
          <option key={k} value={k}>
            {p.types[k]}
          </option>
        ))}
      </Select>
      <MoneyInput
        prefix={sym}
        value={bal}
        onChange={(ev) => setBal(ev.target.value)}
        onBlur={commitBalance}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") (ev.currentTarget as HTMLInputElement).blur();
        }}
        aria-label={p.openingBalance}
        className="w-36"
        inputClassName="!py-1 text-right"
      />
      <button
        onClick={toggleArchived}
        className="rounded p-1.5 text-muted transition-colors hover:bg-card hover:text-ink"
        title={acct.archived ? p.unarchive : p.archive}
        aria-label={acct.archived ? p.unarchive : p.archive}
      >
        {acct.archived ? (
          <ArchiveRestore className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

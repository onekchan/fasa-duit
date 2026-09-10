"use client";

import { useState, useTransition } from "react";
import { CURRENCIES } from "@/lib/constants";
import { format as fmoney, parse as pmoney, currencySymbol } from "@/lib/money";
import { fmt, t as tByLang } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, MoneyInput, Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { updateProfile } from "./actions";

interface Initial {
  currency: string;
  language: Language;
  theme: "system" | "light" | "dark";
  income_sen: number;
  split_needs: number;
  split_wants: number;
  split_savings: number;
}

/**
 * The Profile & Budget panel from the prototype, ported.
 * Income is committed on blur. Split is validated live and committed via the
 * "Save split" button when the three numbers sum to exactly 100. Currency,
 * language, and theme flip immediately on change.
 */
export function ProfileBudgetPanel({
  language,
  initial,
}: {
  language: Language;
  initial: Initial;
}) {
  const strings = tByLang(language);
  const p = strings.settings.profile;
  const sym = currencySymbol(initial.currency);

  const [incomeStr, setIncomeStr] = useState(
    initial.income_sen ? (initial.income_sen / 100).toFixed(2) : "",
  );
  const [needs, setNeeds] = useState(String(initial.split_needs));
  const [wants, setWants] = useState(String(initial.split_wants));
  const [savings, setSavings] = useState(String(initial.split_savings));
  const [status, setStatus] = useState<null | "saving" | "saved" | string>(null);
  const [isPending, startTransition] = useTransition();

  const nNum = Number(needs);
  const wNum = Number(wants);
  const sNum = Number(savings);
  const anyBad = [nNum, wNum, sNum].some((n) => !Number.isFinite(n) || n < 0);
  const total = anyBad ? NaN : nNum + wNum + sNum;
  const splitValid = !anyBad && total === 100;

  const post = (fd: FormData) => {
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateProfile(fd);
        setStatus("saved");
        setTimeout(() => setStatus(null), 1500);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Failed to save");
      }
    });
  };

  const commitIncome = () => {
    const sen = pmoney(incomeStr);
    if (sen === null || sen < 0) return;
    setIncomeStr((sen / 100).toFixed(2));
    if (sen === initial.income_sen) return;
    const fd = new FormData();
    fd.set("income", String(sen / 100));
    post(fd);
  };
  const commitSplit = () => {
    if (!splitValid) return;
    const fd = new FormData();
    fd.set("split_needs", String(nNum));
    fd.set("split_wants", String(wNum));
    fd.set("split_savings", String(sNum));
    post(fd);
  };
  const setField = (key: "currency" | "language" | "theme", value: string) => {
    // Theme flips instantly on click — persist to DB in the background, but
    // stamp <html data-theme="..."> now so the user sees the palette switch
    // without waiting for the server round-trip + revalidate.
    if (key === "theme" && typeof document !== "undefined") {
      const root = document.documentElement;
      if (value === "light" || value === "dark") {
        root.setAttribute("data-theme", value);
      } else {
        root.removeAttribute("data-theme");
      }
      try {
        localStorage.setItem("fasa-theme", value);
      } catch {
        /* private-mode / storage disabled — non-fatal. */
      }
    }
    const fd = new FormData();
    fd.set(key, value);
    post(fd);
  };

  return (
    <Card elevated className="settings-section">
      <h3 className="mb-1 font-display text-lg">{p.title}</h3>
      <p className="mb-5 text-sm text-muted">{p.sub}</p>

      {/* Income */}
      <div className="grid gap-5 border-t border-divider py-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="font-semibold">{p.income}</div>
          <div className="text-sm text-muted">{p.incomeHint}</div>
        </div>
        <MoneyInput
          prefix={sym}
          value={incomeStr}
          onChange={(ev) => setIncomeStr(ev.target.value)}
          onBlur={commitIncome}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") (ev.currentTarget as HTMLInputElement).blur();
          }}
          className="min-w-[220px]"
          aria-label={p.income}
        />
      </div>

      {/* Split */}
      <div className="border-t border-divider py-4">
        <div className="font-semibold">{p.split}</div>
        <div className="mb-3 text-sm text-muted">{p.splitHint}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SplitField label={p.needs} value={needs} onChange={setNeeds} />
          <SplitField label={p.wants} value={wants} onChange={setWants} />
          <SplitField label={p.savings} value={savings} onChange={setSavings} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {splitValid ? (
            <span className="font-semibold text-accent">✓ {p.splitOk}</span>
          ) : (
            <span
              className={cn(
                "font-semibold",
                Number.isFinite(total) && total > 100 ? "text-danger" : "text-warning",
              )}
            >
              {fmt(p.splitOff, { n: anyBad ? "?" : total })}
            </span>
          )}
          <Button
            type="button"
            onClick={commitSplit}
            disabled={!splitValid}
            loading={isPending}
            className="ml-auto"
          >
            {p.saveSplit}
          </Button>
        </div>
      </div>

      {/* Currency */}
      <div className="grid gap-5 border-t border-divider py-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="font-semibold">{p.currency}</div>
        <Select
          value={initial.currency}
          onChange={(ev) => setField("currency", ev.target.value)}
          className="min-w-[220px]"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Language */}
      <div className="grid gap-5 border-t border-divider py-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="font-semibold">{p.language}</div>
        <SegToggle
          value={initial.language}
          onChange={(v) => setField("language", v)}
          options={[
            { value: "en", label: "English" },
            { value: "ms", label: "Bahasa Malaysia" },
          ]}
        />
      </div>

      {/* Theme */}
      <div className="grid gap-5 border-t border-divider py-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="font-semibold">{p.theme}</div>
        <SegToggle
          value={initial.theme}
          onChange={(v) => setField("theme", v)}
          options={[
            { value: "system", label: p.themeSystem },
            { value: "light", label: p.themeLight },
            { value: "dark", label: p.themeDark },
          ]}
        />
      </div>

      {/* Status */}
      {status && (
        <div className="pt-3 text-sm text-muted" aria-live="polite">
          {status === "saving"
            ? strings.common.saving
            : status === "saved"
              ? "✓ " + strings.common.saved
              : status}
        </div>
      )}

      {/* Debug — remove once dashboard shows real totals */}
      <div className="pt-3 text-xs text-muted">
        Preview: split {nNum}/{wNum}/{sNum} · income {fmoney(initial.income_sen, {
          currency: initial.currency,
        })}
      </div>
    </Card>
  );
}

function SplitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <TextInput
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
      />
    </Field>
  );
}

function SegToggle<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (v: V) => void;
  options: Array<{ value: V; label: string }>;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-divider bg-surface p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
            opt.value === value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

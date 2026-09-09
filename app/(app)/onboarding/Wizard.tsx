"use client";

import { useMemo, useState, useTransition } from "react";
import { finishOnboarding, skipOnboarding } from "./actions";
import { CURRENCIES, ACCOUNT_PRESETS, CATEGORIES_SEED } from "@/lib/constants";
import { currencySymbol, parse as parseMoney } from "@/lib/money";
import { fmt } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, MoneyInput, Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type StringsWizard = {
  welcome: string;
  subhead: string;
  stepOf: string;
  step1Label: string; step1Title: string; step1Sub: string;
  incomeLabel: string; incomeHint: string;
  step2Label: string; step2Title: string; step2Sub: string; currencyLabel: string;
  step3Label: string; step3Title: string; step3Sub: string;
  openingBalance: string; addCustom: string; customName: string;
  step4Label: string; step4Title: string; step4Sub: string;
  catCount: string;
  buckets: { needs: string; wants: string; savings: string };
  back: string; next: string; finish: string; skip: string;
  incomeRequired: string;
};

const TOTAL_STEPS = 4;

export function OnboardingWizard({
  language: _language,
  initialCurrency,
  stringsWizard: w,
}: {
  language: "en" | "ms";
  initialCurrency: string;
  stringsWizard: StringsWizard;
}) {
  const [step, setStep] = useState(1);

  // Step 1
  const [incomeStr, setIncomeStr] = useState("");
  const [incomeError, setIncomeError] = useState("");
  const income_sen = parseMoney(incomeStr);
  const incomeValid = income_sen !== null && income_sen > 0;

  // Step 2
  const [currency, setCurrency] = useState(initialCurrency);

  // Step 3 — presets keyed by name → {selected, balance}
  const [presetState, setPresetState] = useState<
    Record<string, { selected: boolean; balance: string }>
  >({});
  const [customAccounts, setCustomAccounts] = useState<
    Array<{ name: string; balance: string }>
  >([]);
  const [customDraft, setCustomDraft] = useState("");

  const togglePreset = (name: string) =>
    setPresetState((s) => {
      const cur = s[name] ?? { selected: false, balance: "" };
      return { ...s, [name]: { ...cur, selected: !cur.selected } };
    });
  const setPresetBalance = (name: string, v: string) =>
    setPresetState((s) => {
      const cur = s[name] ?? { selected: true, balance: "" };
      return { ...s, [name]: { ...cur, selected: true, balance: v } };
    });
  const addCustom = () => {
    const name = customDraft.trim();
    if (!name) return;
    setCustomAccounts((a) => [...a, { name, balance: "" }]);
    setCustomDraft("");
  };

  // Categories preview
  const catsByBucket = useMemo(
    () => ({
      needs: CATEGORIES_SEED.filter((c) => c.bucket === "needs"),
      wants: CATEGORIES_SEED.filter((c) => c.bucket === "wants"),
      savings: CATEGORIES_SEED.filter((c) => c.bucket === "savings"),
    }),
    [],
  );
  const totalCats = CATEGORIES_SEED.length;

  const goNext = () => {
    if (step === 1) {
      if (!incomeValid) {
        setIncomeError(w.incomeRequired);
        return;
      }
      setIncomeError("");
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submit = () => {
    if (!incomeValid) {
      setStep(1);
      setIncomeError(w.incomeRequired);
      return;
    }
    const fd = new FormData();
    fd.set("income", String((income_sen ?? 0) / 100));
    fd.set("currency", currency);
    Object.entries(presetState).forEach(([name, v]) => {
      if (!v.selected) return;
      fd.append("preset", name);
      fd.set(`preset_balance__${name}`, v.balance);
    });
    customAccounts.forEach((a) => {
      fd.append("custom_name", a.name);
      fd.append("custom_balance", a.balance);
    });
    setSubmitError(null);
    startTransition(async () => {
      try {
        await finishOnboarding(fd);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };
  const skip = () => startTransition(() => skipOnboarding());

  const sym = currencySymbol(currency);

  return (
    <Card elevated className="p-8">
      {/* Progress dots */}
      <div className="mb-6 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-pill transition-colors",
              i < step && "bg-accent",
              i === step && "bg-brand",
              i > step && "bg-divider",
            )}
          />
        ))}
      </div>

      {/* Step body */}
      {step === 1 && (
        <>
          <StepLabel>{w.step1Label}</StepLabel>
          <h1 className="mb-2 font-display text-3xl">{w.step1Title}</h1>
          <p className="mb-6 text-muted">{w.step1Sub}</p>
          <Field label={w.incomeLabel} hint={w.incomeHint} error={incomeError || null}>
            <MoneyInput
              prefix={sym}
              placeholder="5,000.00"
              value={incomeStr}
              onChange={(ev) => {
                setIncomeStr(ev.target.value);
                if (incomeError) setIncomeError("");
              }}
              onBlur={() => {
                if (incomeValid && income_sen !== null)
                  setIncomeStr((income_sen / 100).toFixed(2));
              }}
            />
          </Field>
        </>
      )}

      {step === 2 && (
        <>
          <StepLabel>{w.step2Label}</StepLabel>
          <h1 className="mb-2 font-display text-3xl">{w.step2Title}</h1>
          <p className="mb-6 text-muted">{w.step2Sub}</p>
          <Field label={w.currencyLabel}>
            <Select value={currency} onChange={(ev) => setCurrency(ev.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {step === 3 && (
        <>
          <StepLabel>{w.step3Label}</StepLabel>
          <h1 className="mb-2 font-display text-3xl">{w.step3Title}</h1>
          <p className="mb-6 text-muted">{w.step3Sub}</p>

          <div className="flex flex-wrap gap-2">
            {ACCOUNT_PRESETS.map((p) => {
              const sel = presetState[p.name]?.selected;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => togglePreset(p.name)}
                  aria-pressed={!!sel}
                  className={cn(
                    "rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors",
                    sel
                      ? "border-brand bg-brand text-[color:#FFF6EC]"
                      : "border-divider bg-surface text-ink hover:border-brand",
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* Selected preset rows */}
          {Object.entries(presetState).filter(([, v]) => v.selected).length +
            customAccounts.length >
            0 && (
            <div className="mt-4 flex flex-col gap-2">
              {Object.entries(presetState)
                .filter(([, v]) => v.selected)
                .map(([name, v]) => (
                  <div
                    key={name}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-divider bg-surface px-3 py-2"
                  >
                    <span className="font-medium">{name}</span>
                    <MoneyInput
                      prefix={sym}
                      placeholder="0.00"
                      value={v.balance}
                      onChange={(ev) => setPresetBalance(name, ev.target.value)}
                      className="w-40"
                      aria-label={`${w.openingBalance} ${name}`}
                    />
                    <button
                      type="button"
                      onClick={() => togglePreset(name)}
                      className="px-2 text-lg text-muted hover:text-danger"
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              {customAccounts.map((a, i) => (
                <div
                  key={`c-${i}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-divider bg-surface px-3 py-2"
                >
                  <span className="font-medium">{a.name}</span>
                  <MoneyInput
                    prefix={sym}
                    placeholder="0.00"
                    value={a.balance}
                    onChange={(ev) =>
                      setCustomAccounts((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, balance: ev.target.value } : x)),
                      )
                    }
                    className="w-40"
                    aria-label={`${w.openingBalance} ${a.name}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCustomAccounts((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="px-2 text-lg text-muted hover:text-danger"
                    aria-label={`Remove ${a.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <Field label={w.addCustom}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <TextInput
                  placeholder={w.customName}
                  value={customDraft}
                  onChange={(ev) => setCustomDraft(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      addCustom();
                    }
                  }}
                />
                <Button variant="ghost" type="button" onClick={addCustom}>
                  +
                </Button>
              </div>
            </Field>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <StepLabel>{w.step4Label}</StepLabel>
          <h1 className="mb-2 font-display text-3xl">{w.step4Title}</h1>
          <p className="mb-4 text-muted">{w.step4Sub}</p>
          <p className="mb-4 text-sm text-muted">{fmt(w.catCount, { n: totalCats })}</p>

          <div className="grid gap-4 sm:grid-cols-3">
            {(["needs", "wants", "savings"] as const).map((b) => (
              <div key={b}>
                <div className="mb-2">
                  <span
                    className={cn(
                      "inline-block rounded-pill px-2 py-0.5 text-xs font-semibold",
                      b === "needs" && "bg-accent/15 text-accent",
                      b === "wants" && "bg-warning/20 text-warning",
                      b === "savings" && "bg-brand/15 text-brand",
                    )}
                  >
                    {w.buckets[b]}
                  </span>
                </div>
                <ul className="flex flex-col gap-1 text-sm">
                  {catsByBucket[b].map((c) => (
                    <li key={c.name}>{c.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {submitError && <p className="mt-4 text-sm text-danger">{submitError}</p>}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={skip}
          disabled={isPending}
          className="text-sm font-medium text-muted underline underline-offset-4 hover:text-ink"
        >
          {w.skip}
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="ghost" type="button" onClick={goBack} disabled={isPending}>
              {w.back}
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button type="button" onClick={goNext} disabled={isPending}>
              {w.next}
            </Button>
          ) : (
            <Button type="button" onClick={submit} loading={isPending}>
              {w.finish}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
      {children}
    </div>
  );
}

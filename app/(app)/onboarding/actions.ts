"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parse as parseMoney } from "@/lib/money";
import { CATEGORIES_SEED, ACCOUNT_PRESETS } from "@/lib/constants";

/**
 * Complete the onboarding wizard in a single server action:
 *   1. Save income + currency to `profiles`.
 *   2. Insert selected accounts (preset + custom) into `accounts`.
 *   3. Seed the Malaysian default categories into `categories` (only if none
 *      exist yet — avoids double-seeding if the user replays onboarding).
 *   4. Flip `profiles.onboarding_done = true`.
 *
 * Everything is scoped to the current user via `auth.uid()`; RLS backstops it.
 */
export async function finishOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Parse + validate ──────────────────────────────────────────────────────
  const income_sen = parseMoney(String(formData.get("income") ?? ""));
  if (income_sen === null || income_sen <= 0) {
    throw new Error("Please enter a valid monthly income.");
  }

  const currency = String(formData.get("currency") ?? "MYR");

  // Multi-select checkboxes → array of preset names.
  const presetNames = formData.getAll("preset").map(String);
  const presetSelections = presetNames
    .map((name) => {
      const preset = ACCOUNT_PRESETS.find((p) => p.name === name);
      if (!preset) return null;
      const balanceRaw = formData.get(`preset_balance__${name}`);
      const balance_sen = balanceRaw ? (parseMoney(String(balanceRaw)) ?? 0) : 0;
      return {
        name: preset.name,
        type: preset.type,
        institution: preset.name,
        opening_balance_sen: balance_sen,
        currency,
        archived: false,
        user_id: user.id,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // Custom accounts: user typed rows.
  const customNames = formData.getAll("custom_name").map(String).filter(Boolean);
  const customBalances = formData.getAll("custom_balance").map(String);
  const customSelections = customNames.map((name, idx) => ({
    name,
    type: "cash" as const,
    institution: "",
    opening_balance_sen: parseMoney(customBalances[idx] ?? "0") ?? 0,
    currency,
    archived: false,
    user_id: user.id,
  }));

  // ── Writes (all through RLS) ──────────────────────────────────────────────
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      income_sen,
      currency,
      onboarding_done: true,
    })
    .eq("user_id", user.id);
  if (profileErr) throw new Error(profileErr.message);

  const accounts = [...presetSelections, ...customSelections];
  if (accounts.length > 0) {
    const { error: acctErr } = await supabase.from("accounts").insert(accounts);
    if (acctErr) throw new Error(acctErr.message);
  }

  // Seed categories only if the user has none yet.
  const { count } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) === 0) {
    const rows = CATEGORIES_SEED.map((c) => ({
      name: c.name,
      bucket: c.bucket,
      archived: false,
      user_id: user.id,
    }));
    const { error: catErr } = await supabase.from("categories").insert(rows);
    if (catErr) throw new Error(catErr.message);
  }

  redirect("/dashboard");
}

/**
 * "Skip for now" — leaves `onboarding_done = false` so the wizard resurfaces
 * next session, but drops the user into the dashboard for this one.
 */
export async function skipOnboarding() {
  redirect("/dashboard");
}

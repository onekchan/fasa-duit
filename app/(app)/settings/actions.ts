"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parse as parseMoney } from "@/lib/money";

/**
 * Update profile fields. Every field is optional so a caller can flip one
 * setting (theme, language) without re-sending the split. Server-side
 * validation mirrors the DB CHECK constraints.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const patch: Record<string, unknown> = {};

  const incomeRaw = formData.get("income");
  if (incomeRaw !== null && incomeRaw !== "") {
    const sen = parseMoney(String(incomeRaw));
    if (sen === null || sen < 0) throw new Error("Invalid income amount.");
    patch.income_sen = sen;
  }

  const currency = formData.get("currency");
  if (currency) patch.currency = String(currency);

  const language = formData.get("language");
  if (language) {
    const lang = String(language);
    if (!["en", "ms"].includes(lang)) throw new Error("Invalid language.");
    patch.language = lang;
  }

  const theme = formData.get("theme");
  if (theme) {
    const t = String(theme);
    if (!["system", "light", "dark"].includes(t)) throw new Error("Invalid theme.");
    patch.theme = t;
  }

  const splitN = formData.get("split_needs");
  const splitW = formData.get("split_wants");
  const splitS = formData.get("split_savings");
  if (splitN !== null || splitW !== null || splitS !== null) {
    const n = Number(splitN);
    const w = Number(splitW);
    const s = Number(splitS);
    if (![n, w, s].every((x) => Number.isInteger(x) && x >= 0 && x <= 100)) {
      throw new Error("Each share must be a whole number 0–100.");
    }
    if (n + w + s !== 100) {
      throw new Error("Shares must add up to 100.");
    }
    patch.split_needs = n;
    patch.split_wants = w;
    patch.split_savings = s;
  }

  const islamic = formData.get("islamic_mode");
  if (islamic !== null) patch.islamic_mode = islamic === "true" || islamic === "on";

  const onboarding = formData.get("onboarding_done");
  if (onboarding !== null)
    patch.onboarding_done = onboarding === "true" || onboarding === "on";

  if (Object.keys(patch).length === 0) return;

  // RLS restricts this to the current user's row.
  const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

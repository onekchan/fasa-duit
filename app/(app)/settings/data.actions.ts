"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Exports every user-scoped collection as one JSON string. Structure mirrors
 * the table names verbatim so the future importer can round-trip.
 */
export async function exportAllData(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const [profile, accounts, categories, transactions, funds, debts] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id),
    supabase.from("categories").select("*").eq("user_id", user.id),
    supabase.from("transactions").select("*").eq("user_id", user.id),
    supabase.from("sinking_funds").select("*").eq("user_id", user.id),
    supabase.from("debts").select("*").eq("user_id", user.id),
  ]);

  const bundle = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    schema_version: 1,
    profile: profile.data ?? null,
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    transactions: transactions.data ?? [],
    sinking_funds: funds.data ?? [],
    debts: debts.data ?? [],
  };
  return JSON.stringify(bundle, null, 2);
}

/** Flip `onboarding_done` back to false so the wizard resurfaces on next visit. */
export async function replayOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_done: false })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/onboarding");
}

/**
 * Wipe every user-scoped row across all collections while keeping the auth
 * account intact. The user can immediately re-onboard from scratch.
 *
 * Confirmation: caller must submit `confirmWord === "DELETE"` and
 * `confirmEmail === user.email`. Server side re-verifies both so a client
 * bypass can't fire this.
 */
export async function deleteAllData(input: {
  confirmWord: string;
  confirmEmail: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  if (input.confirmWord !== "DELETE") {
    throw new Error("Type DELETE (all caps) to confirm.");
  }
  if (
    (input.confirmEmail ?? "").trim().toLowerCase() !==
    (user.email ?? "").toLowerCase()
  ) {
    throw new Error("Email doesn't match this account.");
  }

  // Delete children first (though FKs are ON DELETE CASCADE so any order works).
  // Doing it explicitly so nothing is left orphaned even if a future FK is
  // relaxed to SET NULL. Sinking-fund contributions live in JSONB so they
  // disappear with the parent row.
  const tables = [
    "transactions",
    "recurring",
    "sinking_funds",
    "debts",
    "accounts",
    "categories",
  ] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) throw new Error(`Failed on ${table}: ${error.message}`);
  }

  // Reset the profile row to defaults (don't delete — the profile stays 1:1
  // with auth.users while the account exists).
  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      currency: "MYR",
      language: "en",
      theme: "system",
      income_sen: 0,
      split_needs: 50,
      split_wants: 30,
      split_savings: 20,
      onboarding_done: false,
      islamic_mode: false,
    })
    .eq("user_id", user.id);
  if (profErr) throw new Error(profErr.message);

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

/**
 * Wipe everything AND delete the auth.users row. Uses the service-role client
 * for the auth deletion since the anon key can't delete users. On success the
 * user's session cookie is invalid and they land on the marketing page.
 */
export async function closeAccount(input: {
  confirmWord: string;
  confirmEmail: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  if (input.confirmWord !== "DELETE") {
    throw new Error("Type DELETE (all caps) to confirm.");
  }
  if (
    (input.confirmEmail ?? "").trim().toLowerCase() !==
    (user.email ?? "").toLowerCase()
  ) {
    throw new Error("Email doesn't match this account.");
  }

  // Wipe app data first. auth.users delete cascades to profiles/etc via FK,
  // but doing it explicitly first keeps behavior predictable if that FK is
  // ever relaxed.
  const tables = [
    "transactions",
    "recurring",
    "sinking_funds",
    "debts",
    "accounts",
    "categories",
    "profiles",
  ] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) throw new Error(`Failed on ${table}: ${error.message}`);
  }

  // Delete the auth user via service role.
  const admin = createAdminClient();
  const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
  if (authErr) throw new Error(authErr.message);

  // Sign out this session so cookies are cleared.
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

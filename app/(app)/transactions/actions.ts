"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parse as parseMoney } from "@/lib/money";
import { buildSampleMonth } from "@/lib/sample-data";
import { todayIso } from "@/lib/dates";

type NewTxn = {
  date: string;
  amount_sen: number;
  account_id: string | null;
  category_id: string | null;
  merchant: string;
  notes: string;
  tags: string[];
  receipt_path: string | null;
};

/**
 * Add one transaction. Called from the client with parsed values. RLS backs
 * the insert — the row's `user_id` is stamped from `auth.uid()` here (never
 * trusted from the client).
 */
export async function addTransaction(input: NewTxn): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      date: input.date,
      amount_sen: input.amount_sen,
      account_id: input.account_id,
      category_id: input.category_id,
      merchant: input.merchant,
      notes: input.notes,
      tags: input.tags,
      receipt_path: input.receipt_path,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { id: data.id };
}

/**
 * Update one transaction. Called from the client when the user edits a row's
 * amount / category / account / merchant / date. RLS scopes the update.
 */
export async function updateTransaction(
  id: string,
  patch: Partial<Omit<NewTxn, "receipt_path">> & { receipt_path?: string | null },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

/**
 * Delete one transaction. Row-level RLS ensures only the owner can delete.
 * We return the full row so the client can pass it back to `restoreTransaction`
 * if the user clicks Undo on the toast.
 */
export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

/**
 * Restore a previously deleted transaction — re-inserts with the same id so
 * anything referencing it (future receipt paths, recurring links) stays
 * consistent. Client keeps the row in memory while the toast is on screen.
 */
export async function restoreTransaction(row: {
  id: string;
  date: string;
  amount_sen: number;
  account_id: string | null;
  category_id: string | null;
  merchant: string | null;
  notes: string | null;
  tags: string[] | null;
  receipt_path: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("transactions").insert({
    id: row.id,
    user_id: user.id,
    date: row.date,
    amount_sen: row.amount_sen,
    account_id: row.account_id,
    category_id: row.category_id,
    merchant: row.merchant ?? "",
    notes: row.notes ?? "",
    tags: row.tags ?? [],
    receipt_path: row.receipt_path,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

/**
 * Insert 20 realistic sample entries so the dashboard has real spend to show.
 * Uses the user's own categories + accounts by name (falls back to null for
 * missing ones, which the ledger still renders).
 */
export async function loadSampleMonth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const [cats, accts] = await Promise.all([
    supabase.from("categories").select("id, name").eq("user_id", user.id),
    supabase.from("accounts").select("id, name").eq("user_id", user.id),
  ]);
  if (cats.error) throw new Error(cats.error.message);
  if (accts.error) throw new Error(accts.error.message);

  const catByName = Object.fromEntries((cats.data ?? []).map((c) => [c.name, c.id]));
  const acctByName = Object.fromEntries((accts.data ?? []).map((a) => [a.name, a.id]));
  const rows = buildSampleMonth(catByName, acctByName).map((r) => ({
    ...r,
    user_id: user.id,
    notes: "",
    receipt_path: null as string | null,
  }));

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { count: rows.length };
}

/**
 * Persist a receipt image. Client uploads the file, then calls this to attach
 * the returned path to a transaction. Path convention:
 *   receipts/<user_id>/<uuid>.<ext>
 * enforced by Storage bucket policies.
 */
export async function attachReceipt(transactionId: string, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("transactions")
    .update({ receipt_path: path })
    .eq("id", transactionId);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

/**
 * Generate a short-lived signed URL for a private receipt. Used when the
 * user clicks the paperclip in the ledger.
 */
export async function getReceiptUrl(path: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(path, 60 * 10); // 10 minutes
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** Convenience — for the empty-state to know how many rows exist. */
export async function getTransactionCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  return count ?? 0;
}

/** Client-side parse helper re-exported so the client bundle stays lean. */
export async function parseAmount(str: string): Promise<number | null> {
  return parseMoney(str);
}

/** For unit tests / future use. */
export const _today = todayIso;

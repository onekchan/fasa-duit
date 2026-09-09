"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DebtType } from "@/lib/debt";

interface UpsertInput {
  name: string;
  type: DebtType;
  balance_sen: number;
  apr_bps: number;
  min_payment_sen: number;
}

export async function createDebt(input: UpsertInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("debts")
    .insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      balance_sen: input.balance_sen,
      apr_bps: input.apr_bps,
      min_payment_sen: input.min_payment_sen,
      archived: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/debts");
  return { id: data.id };
}

export async function updateDebt(id: string, patch: Partial<UpsertInput>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("debts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/debts");
}

export async function deleteDebt(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/debts");
}

export async function restoreDebt(row: {
  id: string;
  name: string;
  type: DebtType;
  balance_sen: number;
  apr_bps: number;
  min_payment_sen: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase.from("debts").insert({
    id: row.id,
    user_id: user.id,
    name: row.name,
    type: row.type,
    balance_sen: row.balance_sen,
    apr_bps: row.apr_bps,
    min_payment_sen: row.min_payment_sen,
    archived: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/debts");
}

/** Flip Islamic finance mode terminology and persist it to the profile. */
export async function setIslamicMode(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase
    .from("profiles")
    .update({ islamic_mode: enabled })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/debts");
  revalidatePath("/settings");
}

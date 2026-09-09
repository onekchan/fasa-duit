"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Contribution } from "@/lib/funds";

interface UpsertInput {
  name: string;
  target_sen: number;
  target_date: string;   // ISO YYYY-MM-DD
  icon: string;
  linked_category_id: string | null;
}

/** Create a fund. `contributions` starts empty, `created_at` = today. */
export async function createFund(input: UpsertInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sinking_funds")
    .insert({
      user_id: user.id,
      name: input.name,
      target_sen: input.target_sen,
      target_date: input.target_date,
      icon: input.icon,
      linked_category_id: input.linked_category_id,
      contributions: [],
      created_at: today,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/funds");
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function updateFund(id: string, patch: Partial<UpsertInput>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("sinking_funds")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/funds");
  revalidatePath("/dashboard");
}

export async function deleteFund(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sinking_funds").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/funds");
  revalidatePath("/dashboard");
}

export async function restoreFund(fund: {
  id: string;
  name: string;
  target_sen: number;
  target_date: string;
  icon: string;
  linked_category_id: string | null;
  contributions: Contribution[];
  created_at: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase.from("sinking_funds").insert({
    id: fund.id,
    user_id: user.id,
    name: fund.name,
    target_sen: fund.target_sen,
    target_date: fund.target_date,
    icon: fund.icon,
    linked_category_id: fund.linked_category_id,
    contributions: fund.contributions,
    created_at: fund.created_at,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/funds");
  revalidatePath("/dashboard");
}

/**
 * Append a contribution to the JSONB array. Reads the current array, appends,
 * writes back. Simple and safe under the low write-frequency typical here.
 */
export async function addContribution(fundId: string, contrib: Contribution) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: current, error: readErr } = await supabase
    .from("sinking_funds")
    .select("contributions")
    .eq("id", fundId)
    .single();
  if (readErr) throw new Error(readErr.message);
  const next = [...((current?.contributions as Contribution[] | null) ?? []), contrib];

  const { error } = await supabase
    .from("sinking_funds")
    .update({ contributions: next })
    .eq("id", fundId);
  if (error) throw new Error(error.message);
  revalidatePath("/funds");
  revalidatePath("/dashboard");
}

/** Remove a contribution by array index. */
export async function removeContribution(fundId: string, index: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: current, error: readErr } = await supabase
    .from("sinking_funds")
    .select("contributions")
    .eq("id", fundId)
    .single();
  if (readErr) throw new Error(readErr.message);
  const arr = ((current?.contributions as Contribution[] | null) ?? []).filter(
    (_, i) => i !== index,
  );
  const { error } = await supabase
    .from("sinking_funds")
    .update({ contributions: arr })
    .eq("id", fundId);
  if (error) throw new Error(error.message);
  revalidatePath("/funds");
  revalidatePath("/dashboard");
}

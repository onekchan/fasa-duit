"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parse as parseMoney } from "@/lib/money";

type AccountType = "cash" | "current" | "savings" | "credit" | "ewallet" | "investment";
const VALID_TYPES: AccountType[] = [
  "cash",
  "current",
  "savings",
  "credit",
  "ewallet",
  "investment",
];

export async function createAccount(input: {
  name: string;
  type: AccountType;
  opening_balance_sen: number;
  currency: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (!VALID_TYPES.includes(input.type)) throw new Error("Invalid account type.");

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type: input.type,
    institution: name,
    opening_balance_sen: input.opening_balance_sen,
    currency: input.currency,
    archived: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function renameAccount(id: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");
  const { error } = await supabase
    .from("accounts")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function setAccountType(id: string, type: AccountType) {
  const supabase = await createClient();
  if (!VALID_TYPES.includes(type)) throw new Error("Invalid account type.");
  const { error } = await supabase.from("accounts").update({ type }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function setAccountOpeningBalance(id: string, raw: string) {
  const supabase = await createClient();
  const sen = parseMoney(raw);
  if (sen === null) throw new Error("Invalid amount.");
  const { error } = await supabase
    .from("accounts")
    .update({ opening_balance_sen: sen })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function setAccountArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ archived })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

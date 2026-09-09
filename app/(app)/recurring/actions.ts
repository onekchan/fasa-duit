"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  asSchedule,
  asTemplate,
  firstMonthlyRun,
  nextMonthlyRunAfter,
  type MonthlySchedule,
  type RecurringTemplate,
} from "@/lib/recurring";
import { todayIso } from "@/lib/dates";

/** Data the client sends when creating / editing a recurring template. */
export type RecurringInput = {
  name: string;
  scheduleDay: number; // 1..31 (SQL & UI clamp to month-end at post time)
  autoPost: boolean;
  template: RecurringTemplate;
  /** Optional. Defaults to first run based on today+scheduleDay. */
  nextRunOverride?: string | null;
};

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, userId: user.id };
}

function validateInput(input: RecurringInput) {
  if (!input.name.trim()) throw new Error("Name is required.");
  const d = Number(input.scheduleDay);
  if (!Number.isInteger(d) || d < 1 || d > 31) {
    throw new Error("Schedule day must be between 1 and 31.");
  }
  if (!Number.isFinite(input.template.amount_sen) || input.template.amount_sen === 0) {
    throw new Error("Amount must be non-zero.");
  }
}

export async function createRecurring(input: RecurringInput): Promise<{ id: string }> {
  validateInput(input);
  const { supabase, userId } = await requireUserId();

  const schedule: MonthlySchedule = { freq: "monthly", day: input.scheduleDay };
  const nextRun = input.nextRunOverride ?? firstMonthlyRun(input.scheduleDay, todayIso());

  const { data, error } = await supabase
    .from("recurring")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      auto_post: input.autoPost,
      schedule,
      template: input.template as unknown as Record<string, unknown>,
      next_run: nextRun,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function updateRecurring(id: string, input: RecurringInput) {
  validateInput(input);
  const { supabase } = await requireUserId();

  const schedule: MonthlySchedule = { freq: "monthly", day: input.scheduleDay };
  const patch: Record<string, unknown> = {
    name: input.name.trim(),
    auto_post: input.autoPost,
    schedule,
    template: input.template,
  };
  if (input.nextRunOverride) patch.next_run = input.nextRunOverride;

  const { error } = await supabase.from("recurring").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
  revalidatePath("/dashboard");
}

/** Pause = archived=true; Resume = archived=false. Kept as one action for clarity. */
export async function setRecurringArchived(id: string, archived: boolean) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("recurring").update({ archived }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
}

export async function setRecurringAutoPost(id: string, autoPost: boolean) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("recurring").update({ auto_post: autoPost }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
}

export async function deleteRecurring(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("recurring").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
}

/**
 * Post the next occurrence NOW. Used by the "Post now" button and by manual
 * (auto_post=false) templates that only run on user tap. Inserts a
 * transaction dated today, then advances next_run one month forward.
 * Everything runs under the user's RLS context — no service role needed.
 */
export async function postRecurringNow(id: string): Promise<{ transactionId: string }> {
  const { supabase, userId } = await requireUserId();
  const { data: rec, error: fetchErr } = await supabase
    .from("recurring")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !rec) throw new Error(fetchErr?.message ?? "Not found");

  const tpl = asTemplate(rec.template);
  const sched = asSchedule(rec.schedule);
  const today = todayIso();

  const { data: txn, error: txnErr } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      date: today,
      amount_sen: tpl.amount_sen,
      account_id: tpl.account_id,
      category_id: tpl.category_id,
      merchant: tpl.merchant || rec.name,
      notes: tpl.notes,
      tags: tpl.tags,
      recurring_id: rec.id,
    })
    .select("id")
    .single();
  if (txnErr) throw new Error(txnErr.message);

  const newNext = nextMonthlyRunAfter(sched.day, today);
  const { error: updErr } = await supabase
    .from("recurring")
    .update({ last_run: today, next_run: newNext })
    .eq("id", id);
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { transactionId: txn.id };
}

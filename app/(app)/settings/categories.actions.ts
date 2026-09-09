"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Bucket = "needs" | "wants" | "savings";

/** Add a category. RLS stamps user_id via auth.uid(). */
export async function createCategory(input: { name: string; bucket: Bucket }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (!["needs", "wants", "savings"].includes(input.bucket))
    throw new Error("Invalid bucket.");

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    bucket: input.bucket,
    archived: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

/** Rename a category. */
export async function renameCategory(id: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");
  const { error } = await supabase
    .from("categories")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

/** Move a category to a different bucket. */
export async function setCategoryBucket(id: string, bucket: Bucket) {
  const supabase = await createClient();
  if (!["needs", "wants", "savings"].includes(bucket))
    throw new Error("Invalid bucket.");
  const { error } = await supabase
    .from("categories")
    .update({ bucket })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Archive / unarchive. Historical transactions still reference the row. */
export async function setCategoryArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ archived })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

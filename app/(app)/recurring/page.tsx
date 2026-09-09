import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecurringClient } from "./RecurringClient";

/**
 * Recurring — Server Component. Reads the user's recurring templates + the
 * accounts / categories needed to populate the editor pickers. RLS scopes
 * every query to the signed-in user.
 */
export default async function RecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, rows, cats, accts] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency, language")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("recurring")
      .select("*")
      .eq("user_id", user.id)
      .order("next_run", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, bucket, archived")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("accounts")
      .select("id, name, archived")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("name"),
  ]);

  return (
    <RecurringClient
      language={(profile.data?.language ?? "en") as "en" | "ms"}
      currency={profile.data?.currency ?? "MYR"}
      initialRows={rows.data ?? []}
      categories={cats.data ?? []}
      accounts={accts.data ?? []}
    />
  );
}

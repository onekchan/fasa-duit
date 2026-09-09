import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FundsClient } from "./FundsClient";
import { isoDaysAgo } from "@/lib/dates";

/**
 * Funds — Server Component. Reads the user's funds, savings-bucket categories
 * (for the linked-category picker), and the last 12 months of transactions
 * (used by linked-category auto-contribution math).
 */
export default async function FundsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, funds, cats, txns] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency, language")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("sinking_funds")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, bucket, archived")
      .eq("user_id", user.id)
      .eq("archived", false),
    supabase
      .from("transactions")
      .select("id, amount_sen, category_id, date")
      .eq("user_id", user.id)
      .gte("date", isoDaysAgo(365))
      .limit(3000),
  ]);

  return (
    <FundsClient
      language={(profile.data?.language ?? "en") as "en" | "ms"}
      currency={profile.data?.currency ?? "MYR"}
      initialFunds={funds.data ?? []}
      categories={(cats.data ?? []).filter((c) => c.bucket === "savings")}
      transactions={txns.data ?? []}
    />
  );
}

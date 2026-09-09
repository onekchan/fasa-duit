import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionsClient } from "./TransactionsClient";

/**
 * Transactions — Server Component. Loads categories, accounts, and the first
 * page of transactions (300 rows, more than enough for month-view UX), then
 * hands them to the interactive client. Realtime subscription in the client
 * keeps the list live as rows change.
 *
 * Deep links: `?merchant=<name>` seeds the search field so links from the
 * dashboard's Top Merchants panel (and any future filter link) land on a
 * pre-filtered ledger.
 */
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ merchant?: string; category?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const [profile, cats, accts, txns] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency, language")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("categories")
      .select("id, name, bucket, archived")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("accounts")
      .select("id, name, type, archived")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(300),
  ]);

  return (
    <TransactionsClient
      currency={profile.data?.currency ?? "MYR"}
      language={(profile.data?.language ?? "en") as "en" | "ms"}
      initialTransactions={txns.data ?? []}
      categories={cats.data ?? []}
      accounts={accts.data ?? []}
      initialQuery={sp.merchant ?? ""}
      initialCategoryFilter={sp.category ?? ""}
    />
  );
}

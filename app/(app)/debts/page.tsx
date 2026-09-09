import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DebtsClient } from "./DebtsClient";

/**
 * Debts — Server Component. Loads the debts + islamic_mode + currency, then
 * hands them to the client. Realtime keeps the list live.
 */
export default async function DebtsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, debts] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency, language, islamic_mode")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <DebtsClient
      language={(profile.data?.language ?? "en") as "en" | "ms"}
      currency={profile.data?.currency ?? "MYR"}
      initialIslamic={!!profile.data?.islamic_mode}
      initialDebts={debts.data ?? []}
    />
  );
}

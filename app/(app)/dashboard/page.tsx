import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { DashboardClient } from "./DashboardClient";
import { isoDaysAgo } from "@/lib/dates";

/**
 * Dashboard — Server Component. Loads profile + categories + last 12 months
 * of transactions (enough for the widest range preset), then hands them to
 * the client for meters, donut, and top-merchants. If the user hasn't set
 * income yet, we render a friendly nudge instead.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile && !profile.onboarding_done) redirect("/onboarding");

  const strings = t(profile?.language);

  // If no income set, show a nudge card (still Server-rendered — no live data
  // needed for the empty state).
  if (!profile || (profile.income_sen ?? 0) === 0) {
    return (
      <div>
        <h1 className="mb-6 font-display text-3xl">{strings.dashboard.title}</h1>
        <div className="rounded-card border border-divider bg-surface p-8 text-center shadow-sm">
          <p className="mb-5 text-muted">{strings.dashboard.emptyIncome}</p>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[color:#FFF6EC] shadow-sm hover:brightness-105"
          >
            {strings.dashboard.setIncome}
          </Link>
        </div>
      </div>
    );
  }

  // Pull 12 months of transactions — bounded so a heavy account doesn't blow
  // memory. If the user has more than 3k rows in a year they can still see
  // real values (aggregates only need reads to be complete).
  const twelveMonthsAgo = isoDaysAgo(365);
  const [cats, txns, funds] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, bucket")
      .eq("user_id", user.id)
      .eq("archived", false),
    supabase
      .from("transactions")
      .select("id, date, amount_sen, category_id, merchant")
      .eq("user_id", user.id)
      .gte("date", twelveMonthsAgo)
      .order("date", { ascending: false })
      .limit(3000),
    supabase
      .from("sinking_funds")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardClient
      language={(profile.language ?? "en") as "en" | "ms"}
      currency={profile.currency ?? "MYR"}
      income_sen={profile.income_sen ?? 0}
      split={{
        needs: profile.split_needs ?? 50,
        wants: profile.split_wants ?? 30,
        savings: profile.split_savings ?? 20,
      }}
      initialTransactions={txns.data ?? []}
      categories={cats.data ?? []}
      initialFunds={funds.data ?? []}
    />
  );
}

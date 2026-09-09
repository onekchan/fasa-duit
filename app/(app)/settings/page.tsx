import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { ProfileBudgetPanel } from "./ProfileBudgetPanel";
import { CategoriesPanel } from "./CategoriesPanel";
import { AccountsPanel } from "./AccountsPanel";
import { DataPanel } from "./DataPanel";

/**
 * Settings — Server Component. Reads the profile from Postgres via RLS
 * (auth.uid() = user_id) and hands it to the client panels for editing.
 * Categories + Accounts panels port in the next slice.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, cats, accts] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("categories").select("*").eq("user_id", user.id).order("name"),
    supabase.from("accounts").select("*").eq("user_id", user.id).order("name"),
  ]);

  const strings = t(profile?.language);
  const lang = (profile?.language ?? "en") as "en" | "ms";
  const currency = profile?.currency ?? "MYR";

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">{strings.settings.title}</h1>
      <div className="flex flex-col gap-4">
        <ProfileBudgetPanel
          language={lang}
          initial={{
            currency,
            language: lang,
            theme: (profile?.theme ?? "system") as "system" | "light" | "dark",
            income_sen: profile?.income_sen ?? 0,
            split_needs: profile?.split_needs ?? 50,
            split_wants: profile?.split_wants ?? 30,
            split_savings: profile?.split_savings ?? 20,
          }}
        />
        <AccountsPanel language={lang} currency={currency} initial={accts.data ?? []} />
        <CategoriesPanel language={lang} initial={cats.data ?? []} />
        <DataPanel language={lang} userEmail={user.email ?? ""} />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { OnboardingWizard } from "./Wizard";

/**
 * Onboarding wizard. Server Component checks whether the user has already
 * finished onboarding; if so, sends them to the dashboard. The interactive
 * wizard itself is a Client Component that calls a Server Action on Finish.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_done, language, currency")
    .eq("user_id", user.id)
    .single();

  if (profile?.onboarding_done) redirect("/dashboard");

  const strings = t(profile?.language);

  return (
    <div className="mx-auto max-w-2xl">
      <OnboardingWizard
        language={(profile?.language ?? "en") as "en" | "ms"}
        initialCurrency={profile?.currency ?? "MYR"}
        stringsWizard={strings.wizard}
      />
    </div>
  );
}

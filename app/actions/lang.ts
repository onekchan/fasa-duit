"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LANG_COOKIE, LANG_COOKIE_OPTIONS } from "@/lib/lang";
import type { Language } from "@/lib/i18n";

/**
 * Persist the user's language choice.
 *
 * Always sets the `lang` cookie (works for anonymous visitors too), and — if
 * the caller is signed in — also updates `profiles.language` so the choice
 * syncs across devices next time they log in.
 *
 * Revalidates every authenticated route + the landing so the server-rendered
 * strings pick up the new catalog on the next paint. This is cheap on the
 * App Router because the RSC tree keys off the cookie value.
 */
export async function setLanguage(lang: Language): Promise<void> {
  if (lang !== "en" && lang !== "ms") return;

  const store = await cookies();
  store.set(LANG_COOKIE, lang, LANG_COOKIE_OPTIONS);

  // Best-effort profile sync — never blocks the toggle if the user is
  // anonymous or Supabase is briefly down.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ language: lang })
        .eq("user_id", user.id);
    }
  } catch {
    /* silent — cookie already wrote, the UI will still swap on next render. */
  }

  // Bump every route that reads the cookie/profile so the new catalog shows.
  revalidatePath("/", "layout");
}

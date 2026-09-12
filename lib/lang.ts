import { cookies } from "next/headers";
import type { Language } from "@/lib/i18n";

/**
 * Language cookie plumbing. One place decides how anonymous visitors get a
 * language and how the choice persists across requests.
 *
 * Cookie name is deliberately short ("lang") so it fits under the free
 * middleware header budget and reads cleanly in devtools. Value is always
 * one of "en" | "ms" — never a locale like "en-MY".
 *
 * Server flow (this file):
 *   * `getLangFromCookies()` reads the cookie; falls back to "en" so anonymous
 *     visitors land on English by design decision (see plan.md 2026-09-12).
 *   * Authenticated pages should PREFER `profile.language` and only fall back
 *     to this cookie when the profile hasn't been fetched yet.
 *
 * Client flow (see `LanguageToggle`):
 *   * Toggle calls the `setLanguageCookie` server action which sets the cookie
 *     AND updates `profiles.language` if the user is signed in — so a
 *     signed-in user's choice syncs across devices.
 */

export const LANG_COOKIE = "lang";

/** SameSite=Lax + a 1-year max-age. Not HttpOnly — the client can read it
 *  from `document.cookie` for the top-bar toggle. Not marked Secure so it
 *  works on localhost; NEXT_PUBLIC_SITE_URL uses HTTPS in production so the
 *  cookie is only sent over TLS anyway. */
export const LANG_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: "/",
  sameSite: "lax" as const,
};

/** Read the language cookie on the server. Defaults to "en" if unset or
 *  unknown. Never throws — callers can rely on the return being valid. */
export async function getLangFromCookies(): Promise<Language> {
  const store = await cookies();
  const raw = store.get(LANG_COOKIE)?.value;
  return raw === "ms" ? "ms" : "en";
}

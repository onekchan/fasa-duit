import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { BottomTabBar } from "@/components/app-shell/BottomTabBar";
import { SideNav } from "@/components/app-shell/SideNav";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ThemeApplier } from "@/components/app-shell/ThemeApplier";
import { LanguageToggle } from "@/components/app-shell/LanguageToggle";
import { t as tByLang, type Language } from "@/lib/i18n";

/**
 * Authenticated app shell. Middleware already redirects unauthenticated
 * visitors to /login, but we re-check here so the server can trust the user
 * exists before rendering. Sidebar + topbar port from the prototype design;
 * only bare bones here for the scaffold.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Read the user's saved theme so ThemeApplier can stamp `data-theme` on
  // <html>, and language so the top-bar toggle + shell strings show the right
  // catalog. "system"/"en" (or a fetch failure) leaves the attribute alone
  // and English respectively.
  const { data: profile } = await supabase
    .from("profiles")
    .select("theme, language")
    .eq("user_id", user.id)
    .single();
  const theme = ((profile?.theme as "system" | "light" | "dark" | undefined) ?? "system");
  const lang = ((profile?.language as Language | undefined) ?? "en");
  const strings = tByLang(lang);

  return (
    <div className="min-h-screen md:pl-[220px]">
      {/* Applies the user's chosen theme to <html data-theme="..."> so the
          design-token overrides in globals.css switch palettes even when the
          OS preference disagrees. */}
      <ThemeApplier theme={theme} />
      {/* Sidebar — desktop only. Mobile users get the bottom tab bar. */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[200px] flex-col gap-5 border-r border-divider bg-card p-5 shadow-[4px_0_20px_rgba(62,42,31,.05)] md:flex">
        <div className="flex items-center justify-between">
          <div className="font-display text-xl font-bold text-brand">FASA Duit</div>
        </div>
        <SideNav lang={lang} />
        <div className="mt-auto flex flex-col gap-3">
          {/* Language toggle above the log-out button so it's always in reach
              without going into Settings. Uses the profile language so the
              current pill is correct on load. */}
          <LanguageToggle current={lang} className="self-start" />
          <form action={logout}>
            <SubmitButton
              variant="ghost"
              className="w-full !border-divider !text-muted"
              loadingLabel={strings.common.saving}
            >
              {strings.common.logout}
            </SubmitButton>
          </form>
        </div>
      </aside>

      {/* Mobile-only top bar: brand + language toggle + log-out so users can
          still reach both without the desktop sidebar. Hidden on desktop. */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-divider bg-bg/85 px-3 py-3 backdrop-blur md:hidden">
        <div className="font-display text-lg font-bold text-brand">FASA Duit</div>
        <div className="flex items-center gap-2">
          <LanguageToggle current={lang} variant="compact" />
          <form action={logout}>
            <SubmitButton
              variant="ghost"
              className="!px-2 !py-1.5 !text-sm !text-muted"
              loadingLabel="…"
            >
              {strings.common.logout}
            </SubmitButton>
          </form>
        </div>
      </header>

      {/* Main content. Extra bottom padding on mobile so the bottom tab bar
          doesn't cover the last row. */}
      <main className="w-full px-4 pb-24 pt-4 md:px-7 md:pb-10 md:pt-6">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>

      <BottomTabBar lang={lang} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { BottomTabBar } from "@/components/app-shell/BottomTabBar";
import { SubmitButton } from "@/components/ui/SubmitButton";

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

  const nav: Array<{ href: string; label: string }> = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/funds", label: "Funds" },
    { href: "/debts", label: "Debts" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen md:pl-[220px]">
      {/* Sidebar — desktop only. Mobile users get the bottom tab bar. */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[200px] flex-col gap-5 border-r border-divider bg-card p-5 shadow-[4px_0_20px_rgba(62,42,31,.05)] md:flex">
        <div className="flex items-center justify-between">
          <div className="font-display text-xl font-bold text-brand">FASA Duit</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 font-medium text-muted transition hover:bg-surface hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-auto">
          <SubmitButton
            variant="ghost"
            className="w-full !border-divider !text-muted"
            loadingLabel="Signing out…"
          >
            Log out
          </SubmitButton>
        </form>
      </aside>

      {/* Mobile-only top bar: brand + log-out so users can still reach it
          without the desktop sidebar. Hidden on desktop. */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-divider bg-bg/85 px-4 py-3 backdrop-blur md:hidden">
        <div className="font-display text-lg font-bold text-brand">FASA Duit</div>
        <form action={logout}>
          <SubmitButton
            variant="ghost"
            className="!py-1.5 !text-sm !text-muted"
            loadingLabel="…"
          >
            Log out
          </SubmitButton>
        </form>
      </header>

      {/* Main content. Extra bottom padding on mobile so the bottom tab bar
          doesn't cover the last row. */}
      <main className="w-full px-4 pb-24 pt-4 md:px-7 md:pb-10 md:pt-6">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>

      <BottomTabBar />
    </div>
  );
}

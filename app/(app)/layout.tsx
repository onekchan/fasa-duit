import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

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
    <div className="min-h-screen pl-[220px]">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-[200px] flex-col gap-5 border-r border-divider bg-card p-5 shadow-[4px_0_20px_rgba(62,42,31,.05)]">
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
          <button
            type="submit"
            className="w-full rounded-lg border border-divider px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink"
          >
            Log out
          </button>
        </form>
      </aside>

      <main className="w-full px-7 pb-10 pt-6">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
    </div>
  );
}

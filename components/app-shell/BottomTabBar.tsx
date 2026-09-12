"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Coins, PiggyBank, Receipt, Repeat, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { t as tByLang, type Language } from "@/lib/i18n";

/**
 * Mobile-only bottom tab bar. Hidden at md+ where the fixed sidebar takes over.
 * 6 equally-spaced tabs with icon + label; the active one is terracotta. The
 * bar is a client component because it uses usePathname to highlight the
 * current route.
 *
 * Labels come from `tabsShort` in the i18n catalog — short forms because at
 * 375px each tab is ~62px wide and full labels ("Papan Pemuka", "Transactions",
 * "Recurring") would wrap to two lines and break the fixed bar height.
 *
 * A single fixed footer respects iOS safe-area (env(safe-area-inset-bottom))
 * so the icons don't disappear behind the iPhone home indicator.
 */
export function BottomTabBar({ lang = "en" }: { lang?: Language }) {
  const path = usePathname();
  const short = tByLang(lang).tabsShort;
  const tabs: Array<{ href: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { href: "/dashboard", label: short.dashboard, Icon: BarChart3 },
    { href: "/transactions", label: short.transactions, Icon: Receipt },
    { href: "/recurring", label: short.recurring, Icon: Repeat },
    { href: "/funds", label: short.funds, Icon: PiggyBank },
    { href: "/debts", label: short.debts, Icon: Coins },
    { href: "/settings", label: short.settings, Icon: Settings },
  ];
  return (
    <nav
      aria-label="primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-surface md:hidden",
        // iOS safe area — extra bottom padding so tabs sit above the home bar
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="grid grid-cols-6">
        {tabs.map(({ href, label, Icon }) => {
          const active = path === href || path?.startsWith(href + "/");
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

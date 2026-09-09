"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Coins, PiggyBank, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile-only bottom tab bar. Hidden at md+ where the fixed sidebar takes over.
 * 5 equally-spaced tabs with icon + label; the active one is terracotta. The
 * bar is a client component because it uses usePathname to highlight the
 * current route.
 *
 * A single fixed footer respects iOS safe-area (env(safe-area-inset-bottom))
 * so the icons don't disappear behind the iPhone home indicator.
 */
export function BottomTabBar() {
  const path = usePathname();
  const tabs: Array<{ href: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
    { href: "/transactions", label: "Log", Icon: Receipt },
    { href: "/funds", label: "Funds", Icon: PiggyBank },
    { href: "/debts", label: "Debts", Icon: Coins },
    { href: "/settings", label: "Settings", Icon: Settings },
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
      <ul className="grid grid-cols-5">
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

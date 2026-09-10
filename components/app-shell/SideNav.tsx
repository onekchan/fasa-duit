"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Coins,
  PiggyBank,
  Receipt,
  Repeat,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Desktop sidebar nav (client component so it can highlight the active route
 * via `usePathname`). The mobile equivalent lives in `BottomTabBar.tsx` — the
 * same six links appear in both places; keep them in sync.
 *
 * Active-state visuals: warm cream surface with terracotta text and a thin
 * inset ring so the item reads as "you are here" without shouting. The icon
 * flips to the brand color too. Everything else stays muted with a subtle
 * hover.
 */
const items: Array<{
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/transactions", label: "Transactions", Icon: Receipt },
  { href: "/recurring", label: "Recurring", Icon: Repeat },
  { href: "/funds", label: "Funds", Icon: PiggyBank },
  { href: "/debts", label: "Debts", Icon: Coins },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="primary" className="flex flex-col gap-1">
      {items.map(({ href, label, Icon }) => {
        // Exact match OR a nested route under this section (`/funds/xyz` still
        // highlights Funds). `/dashboard` matches only itself so `/dashboards/…`
        // (hypothetical) wouldn't accidentally light both up.
        const active = path === href || path?.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface text-brand shadow-[inset_0_0_0_1px_var(--divider)]"
                : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-brand" : "text-muted group-hover:text-ink",
              )}
              aria-hidden="true"
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

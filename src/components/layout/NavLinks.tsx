"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BoxesIcon,
  ClipboardListIcon,
  HomeIcon,
  PlusIcon,
  ReceiptIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/orders", label: "Orders", icon: ClipboardListIcon },
  { href: "/inventory", label: "Stock", icon: BoxesIcon },
  { href: "/expenses", label: "Expenses", icon: ReceiptIcon },
  { href: "/reports", label: "Reports", icon: BarChart3Icon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || (pathname.startsWith(`${href}/`) && pathname !== "/orders/new");
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-2 bottom-2 left-0 w-[3px] rounded-full coating transition-transform duration-300",
                active ? "scale-y-100" : "scale-y-0",
              )}
            />
            <Icon className="size-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const MOBILE = [NAV[0], NAV[1], { href: "/orders/new", label: "New", icon: PlusIcon }, NAV[2], NAV[3], NAV[4]];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-card/90 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      {MOBILE.map(({ href, label, icon: Icon }) => {
        const isNew = href === "/orders/new";
        const active = isNew ? pathname === href : isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
              active && "text-foreground",
            )}
          >
            <span
              className={cn(
                "grid place-items-center rounded-full transition-transform active:scale-90",
                isNew ? "size-9 bg-primary text-primary-foreground shadow-lg" : "size-6",
              )}
            >
              <Icon className="size-5" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

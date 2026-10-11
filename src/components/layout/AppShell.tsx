import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOutIcon, PlusIcon, SettingsIcon } from "lucide-react";

import { LensMark } from "@/components/shared/LensMark";
import { MobileNav, SidebarNav } from "@/components/layout/NavLinks";
import { SearchCommand } from "@/components/layout/SearchCommand";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

import type { ShopSettings } from "@/types/domain";

function ShopBrand({ settings, compact = false }: { settings: ShopSettings; compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      {settings.logo_url ? (
        <Image
          src={settings.logo_url}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-lg border bg-white object-contain p-0.5"
        />
      ) : (
        <LensMark className="h-6 w-12 shrink-0" />
      )}
      {!compact && <span className="truncate font-heading text-[1.05rem] leading-tight font-bold">{settings.shop_name}</span>}
    </Link>
  );
}

export function AppShell({ settings, children }: { settings: ShopSettings; children: ReactNode }) {
  return (
    <div
      className="min-h-dvh lg:grid lg:grid-cols-[252px_1fr]"
      style={{ "--brand": settings.brand_color } as CSSProperties}
    >
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card/60 px-4 py-5 backdrop-blur lg:flex">
        <div className="px-1">
          <ShopBrand settings={settings} />
        </div>
        <Link href="/orders/new" className={cn(buttonVariants({ size: "lg" }), "glint w-full justify-between rounded-xl")}>
          <span className="flex items-center gap-2">
            <PlusIcon /> New order
          </span>
          <kbd className="rounded bg-white/15 px-1.5 font-mono text-[11px]">N</kbd>
        </Link>
        <SidebarNav />
        <form action={signOut} className="mt-auto">
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOutIcon className="size-[18px]" /> Sign out
          </button>
        </form>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 lg:px-8">
            <div className="lg:hidden">
              <ShopBrand settings={settings} compact />
            </div>
            <SearchCommand />
            <Link
              href="/settings"
              aria-label="Settings"
              className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "ml-auto lg:hidden")}
            >
              <SettingsIcon />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] px-4 pt-6 pb-28 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}

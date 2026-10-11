import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";

import { CountUp } from "@/components/shared/CountUp";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { ITEM_CATEGORIES } from "@/constants/app";
import { getLowStock } from "@/features/inventory/queries";
import { OrderRows } from "@/features/orders/components/OrderRows";
import { getOutstandingBalance, listOrders } from "@/features/orders/queries";
import { MonthChart } from "@/features/reports/components/MonthChart";
import { getDailyTotals, sumTotals } from "@/features/reports/queries";
import { getSettings } from "@/features/settings/queries";
import { formatMoney, monthRange, todayIn } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Today" };

const OPEN_ON_DASHBOARD = 8;

function greeting(timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const settings = await getSettings();
  const today = todayIn(settings.timezone);
  const { start, end } = monthRange(today.slice(0, 7));

  const [month, open, outstanding, lowStock] = await Promise.all([
    getDailyTotals(start, end),
    listOrders({ status: "open", today }),
    getOutstandingBalance(),
    getLowStock(),
  ]);

  const todayTotals = month.find((d) => d.day === today) ?? { sales: 0, orders: 0, collected: 0, expenses: 0 };
  const mtd = sumTotals(month);
  const net = mtd.collected - mtd.expenses;
  const money = (n: number) => formatMoney(n, settings.currency);
  const cur = `${settings.currency} `;
  const dateLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: settings.timezone }).format(new Date());

  const ledger = [
    { label: "Sales today", value: todayTotals.sales, note: `${todayTotals.orders} order${todayTotals.orders === 1 ? "" : "s"} booked` },
    { label: "Cash in today", value: todayTotals.collected, note: "Advances and balances received" },
    { label: "Spent today", value: todayTotals.expenses, note: "Shop expenses", href: "/expenses" },
    {
      label: "Customers owe",
      value: outstanding.amount,
      note: `${outstanding.orders} order${outstanding.orders === 1 ? "" : "s"} with a balance`,
      href: "/orders?status=open",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">{dateLabel}</p>
          <h1 className="text-3xl font-bold sm:text-[2.1rem]">{greeting(settings.timezone)}</h1>
        </div>
        <Link href="/orders/new" className={cn(buttonVariants({ size: "lg" }), "glint rounded-xl lg:hidden")}>
          <PlusIcon /> New order
        </Link>
      </div>

      <section aria-label="Today's figures" className="card-surface grid grid-cols-2 lg:grid-cols-4">
        {ledger.map((item, i) => {
          const body = (
            <>
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
                <CountUp value={item.value} prefix={cur} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            </>
          );
          const cls = cn(
            "block p-5 sm:p-6",
            i % 2 === 1 && "border-l",
            i >= 2 && "border-t lg:border-t-0",
            i === 2 && "lg:border-l",
            item.href && "transition-colors hover:bg-muted/50",
          );
          return item.href ? (
            <Link key={item.label} href={item.href} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={item.label} className={cls}>
              {body}
            </div>
          );
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="open-heading" className="card-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 sm:px-6">
            <div>
              <h2 id="open-heading" className="text-lg font-semibold">
                Waiting to go out
              </h2>
              <p className="text-sm text-muted-foreground">Open orders, soonest delivery first</p>
            </div>
            <Link href="/orders?status=open" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              All <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          {open.rows.length ? (
            <OrderRows rows={open.rows.slice(0, OPEN_ON_DASHBOARD)} currency={settings.currency} today={today} showDue />
          ) : (
            <EmptyState title="Nothing waiting">
              Every order is delivered.{" "}
              <Link href="/orders/new" className="font-medium text-foreground underline underline-offset-4">
                Book a new one
              </Link>
            </EmptyState>
          )}
        </section>

        <div className="space-y-5">
          <section aria-labelledby="month-heading" className="card-surface p-5 sm:p-6">
            <div className="mb-5 flex items-baseline justify-between gap-2">
              <h2 id="month-heading" className="text-lg font-semibold">
                This month
              </h2>
              <Link href="/reports" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Reports
              </Link>
            </div>
            <dl className="mb-6 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Sales</dt>
                <dd className="font-heading text-lg font-bold">{money(mtd.sales)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expenses</dt>
                <dd className="font-heading text-lg font-bold">{money(mtd.expenses)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Net cash</dt>
                <dd className={cn("font-heading text-lg font-bold", net < 0 && "text-destructive")}>{money(net)}</dd>
              </div>
            </dl>
            <MonthChart days={month} start={start} end={end} today={today} currency={settings.currency} />
          </section>

          {lowStock.length > 0 && (
            <section aria-labelledby="low-heading" className="card-surface p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="low-heading" className="flex items-center gap-2 text-lg font-semibold">
                  <TriangleAlertIcon className="size-4 text-status-pending" /> Running low
                </h2>
                <Link href="/inventory?low=1" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Restock
                </Link>
              </div>
              <ul className="space-y-2 text-sm">
                {lowStock.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {[item.brand, item.name].filter(Boolean).join(" ")}
                      <span className="ml-2 text-xs text-muted-foreground">{ITEM_CATEGORIES[item.category]}</span>
                    </span>
                    <span className={cn("shrink-0 font-mono font-semibold", item.qty <= 0 ? "text-destructive" : "text-status-pending")}>
                      {item.qty} left
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

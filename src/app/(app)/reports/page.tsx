import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { MonthNav, parseMonth } from "@/components/shared/MonthNav";
import { PageHeader } from "@/components/shared/PageHeader";
import { expensesByCategory, listExpenses } from "@/features/expenses/queries";
import { MonthChart } from "@/features/reports/components/MonthChart";
import { byMonth, getDailyTotals, sumTotals } from "@/features/reports/queries";
import { getSettings } from "@/features/settings/queries";
import { formatDate, formatMoney, monthRange, shiftMonth, todayIn } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const TREND_MONTHS = 12;

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const [{ m }, settings] = await Promise.all([searchParams, getSettings()]);
  const today = todayIn(settings.timezone);
  const currentMonth = today.slice(0, 7);
  const month = parseMonth(m, currentMonth);
  const { start, end } = monthRange(month);
  const trendStart = `${shiftMonth(month, -(TREND_MONTHS - 1))}-01`;

  const [days, trendDays, expenses] = await Promise.all([
    getDailyTotals(start, end),
    getDailyTotals(trendStart, end),
    listExpenses(start, end),
  ]);

  const money = (n: number) => formatMoney(n, settings.currency);
  const totals = sumTotals(days);
  const net = totals.collected - totals.expenses;
  const categories = expensesByCategory(expenses);

  const months = byMonth(trendDays);
  const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const key = shiftMonth(month, i - (TREND_MONTHS - 1));
    return { key, ...(months.get(key) ?? { sales: 0, orders: 0, collected: 0, expenses: 0 }) };
  });
  const trendMax = Math.max(1, ...trend.map((t) => Math.max(t.sales, t.expenses)));

  const cards = [
    { label: "Sales", value: money(totals.sales), note: `${totals.orders} orders booked` },
    { label: "Cash collected", value: money(totals.collected), note: "Advances + balances received" },
    { label: "Expenses", value: money(totals.expenses), note: `${expenses.length} entries` },
    { label: "Net cash", value: money(net), note: "Collected − expenses", tone: net < 0 ? "text-destructive" : "text-success" },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales are orders booked. Cash collected is money actually received."
        actions={<MonthNav month={month} currentMonth={currentMonth} basePath="/reports" />}
      />

      <div className="space-y-5">
        <section aria-label="Month totals" className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="card-surface p-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className={cn("mt-1 font-heading text-2xl font-bold", c.tone)}>{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="daily-chart" className="card-surface p-5 sm:p-6">
          <h2 id="daily-chart" className="mb-5 text-lg font-semibold">
            Day by day
          </h2>
          <MonthChart days={days} start={start} end={end} today={month === currentMonth ? today : end} currency={settings.currency} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section aria-labelledby="daily-table" className="card-surface overflow-hidden">
            <h2 id="daily-table" className="px-5 pt-5 pb-3 text-lg font-semibold sm:px-6">
              Daily sales &amp; expenses
            </h2>
            {days.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2 font-medium sm:px-6">Day</th>
                      <th className="py-2 text-right font-medium">Orders</th>
                      <th className="py-2 text-right font-medium">Sales</th>
                      <th className="py-2 text-right font-medium">Collected</th>
                      <th className="py-2 text-right font-medium">Expenses</th>
                      <th className="px-5 py-2 text-right font-medium sm:px-6">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...days].reverse().map((d) => (
                      <tr key={d.day} className="border-t">
                        <td className="px-5 py-2.5 sm:px-6">{formatDate(d.day, true)}</td>
                        <td className="py-2.5 text-right">{d.orders}</td>
                        <td className="py-2.5 text-right font-medium">{money(d.sales)}</td>
                        <td className="py-2.5 text-right">{money(d.collected)}</td>
                        <td className="py-2.5 text-right">{money(d.expenses)}</td>
                        <td className={cn("px-5 py-2.5 text-right font-semibold sm:px-6", d.collected - d.expenses < 0 && "text-destructive")}>
                          {money(d.collected - d.expenses)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No activity this month" />
            )}
          </section>

          <div className="space-y-5">
            <section aria-labelledby="trend" className="card-surface p-5 sm:p-6">
              <h2 id="trend" className="mb-5 text-lg font-semibold">
                Last 12 months
              </h2>
              <div className="flex h-36 items-end gap-1.5">
                {trend.map((t, i) => (
                  <Link
                    key={t.key}
                    href={`/reports?m=${t.key}`}
                    title={`${t.key}: sales ${money(t.sales)}, expenses ${money(t.expenses)}`}
                    className={cn("flex h-full flex-1 items-end justify-center gap-0.5 rounded-md", t.key === month && "bg-muted")}
                  >
                    <span
                      className="bar w-full max-w-5 rounded-t coating-v"
                      style={{ height: `${Math.max(2, (t.sales / trendMax) * 100)}%`, "--i": i * 3 } as React.CSSProperties}
                    />
                    <span
                      className="bar w-1.5 rounded-t bg-destructive/60"
                      style={{ height: `${(t.expenses / trendMax) * 100}%`, "--i": i * 3 } as React.CSSProperties}
                    />
                  </Link>
                ))}
              </div>
              <div className="mt-2 flex gap-1.5 font-mono text-[10px] text-muted-foreground">
                {trend.map((t) => (
                  <span key={t.key} className="flex-1 text-center">
                    {new Intl.DateTimeFormat("en-GB", { month: "narrow", timeZone: "UTC" }).format(new Date(`${t.key}-01T00:00:00Z`))}
                  </span>
                ))}
              </div>
            </section>

            <section aria-labelledby="categories" className="card-surface p-5 sm:p-6">
              <h2 id="categories" className="mb-3 text-lg font-semibold">
                Where the money went
              </h2>
              {categories.length ? (
                <ul className="space-y-2 text-sm">
                  {categories.map((c) => (
                    <li key={c.category} className="flex justify-between">
                      <span>{c.category}</span>
                      <span className="font-medium">
                        {money(c.amount)}
                        <span className="ml-2 text-xs text-muted-foreground">{Math.round((c.amount / Math.max(1, totals.expenses)) * 100)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No expenses recorded.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

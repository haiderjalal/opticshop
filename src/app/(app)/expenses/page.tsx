import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/EmptyState";
import { MonthNav, parseMonth } from "@/components/shared/MonthNav";
import { PageHeader } from "@/components/shared/PageHeader";
import { PAYMENT_METHODS } from "@/constants/app";
import { DeleteExpenseButton } from "@/features/expenses/components/DeleteExpenseButton";
import { ExpenseForm } from "@/features/expenses/components/ExpenseForm";
import { expensesByCategory, listExpenses } from "@/features/expenses/queries";
import { getSettings } from "@/features/settings/queries";
import { formatDate, formatMoney, monthRange, todayIn } from "@/lib/format";

import type { Expense } from "@/types/domain";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const [{ m }, settings] = await Promise.all([searchParams, getSettings()]);
  const today = todayIn(settings.timezone);
  const month = parseMonth(m, today.slice(0, 7));
  const { start, end } = monthRange(month);
  const expenses = await listExpenses(start, end);

  const money = (n: number) => formatMoney(n, settings.currency);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categories = expensesByCategory(expenses);
  const top = categories[0]?.amount ?? 1;

  const days = new Map<string, Expense[]>();
  expenses.forEach((e) => days.set(e.spent_on, [...(days.get(e.spent_on) ?? []), e]));

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Rent, salaries, lab bills — everything that leaves the till."
        actions={<MonthNav month={month} currentMonth={today.slice(0, 7)} basePath="/expenses" />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <ExpenseForm today={today} />

          <section aria-labelledby="entries" className="card-surface overflow-hidden">
            <h2 id="entries" className="px-5 pt-5 pb-2 text-lg font-semibold sm:px-6">
              Entries
            </h2>
            {expenses.length ? (
              <div className="stagger">
                {[...days].map(([day, entries]) => (
                  <div key={day} className="border-t first:border-t-0">
                    <div className="flex justify-between bg-muted/50 px-5 py-2 text-xs font-semibold text-muted-foreground sm:px-6">
                      <span>{formatDate(day)}</span>
                      <span>{money(entries.reduce((s, e) => s + e.amount, 0))}</span>
                    </div>
                    <ul className="divide-y">
                      {entries.map((e) => (
                        <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{e.category}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {PAYMENT_METHODS[e.method]}
                              {e.note && ` · ${e.note}`}
                            </p>
                          </div>
                          <span className="font-semibold">{money(e.amount)}</span>
                          <DeleteExpenseButton id={e.id} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No expenses this month">Add the first one above.</EmptyState>
            )}
          </section>
        </div>

        <aside aria-labelledby="by-category" className="card-surface h-fit p-5 sm:p-6 lg:sticky lg:top-24">
          <p className="text-sm text-muted-foreground">Spent in this month</p>
          <p className="mb-5 font-heading text-3xl font-bold">{money(total)}</p>
          <h2 id="by-category" className="mb-3 text-sm font-semibold">
            By category
          </h2>
          {categories.length ? (
            <ul className="space-y-3">
              {categories.map((c, i) => (
                <li key={c.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="font-medium">{money(c.amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="grow-x h-full rounded-full bg-destructive/60"
                      style={{ width: `${(c.amount / top) * 100}%`, animationDelay: `${i * 60}ms` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          )}
        </aside>
      </div>
    </>
  );
}

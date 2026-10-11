import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { DailyTotal } from "@/types/domain";

export async function getDailyTotals(start: string, end: string): Promise<DailyTotal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_totals")
    .select("day, sales, orders, collected, expenses")
    .gte("day", start)
    .lte("day", end)
    .order("day");
  if (error) {
    logger.error("Failed to load daily totals", { code: error.code });
    throw new Error("Unable to load sales figures.");
  }
  return (data ?? []).map((d) => ({
    day: d.day as string,
    sales: Number(d.sales),
    orders: Number(d.orders),
    collected: Number(d.collected),
    expenses: Number(d.expenses),
  }));
}

export interface Totals {
  sales: number;
  orders: number;
  collected: number;
  expenses: number;
}

export function sumTotals(days: DailyTotal[]): Totals {
  return days.reduce(
    (t, d) => ({
      sales: t.sales + d.sales,
      orders: t.orders + d.orders,
      collected: t.collected + d.collected,
      expenses: t.expenses + d.expenses,
    }),
    { sales: 0, orders: 0, collected: 0, expenses: 0 },
  );
}

/** Rolls daily rows up into `YYYY-MM` buckets. */
export function byMonth(days: DailyTotal[]): Map<string, Totals> {
  const months = new Map<string, DailyTotal[]>();
  days.forEach((d) => {
    const key = d.day.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), d]);
  });
  return new Map([...months].map(([month, rows]) => [month, sumTotals(rows)]));
}

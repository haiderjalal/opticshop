import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { Expense } from "@/types/domain";

export async function listExpenses(start: string, end: string): Promise<Expense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, spent_on, category, note, amount, method")
    .gte("spent_on", start)
    .lte("spent_on", end)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("Failed to list expenses", { code: error.code });
    throw new Error("Unable to load expenses.");
  }
  return (data ?? []).map((e) => ({ ...(e as Expense), amount: Number(e.amount) }));
}

export function expensesByCategory(expenses: Expense[]): { category: string; amount: number }[] {
  const totals = new Map<string, number>();
  expenses.forEach((e) => totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount));
  return [...totals].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

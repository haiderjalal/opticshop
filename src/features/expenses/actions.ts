"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fromDbError, fromZodError } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validations/shop.schema";

import type { ActionResult } from "@/types/domain";

export async function addExpense(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse({
    spent_on: form.get("spent_on"),
    category: String(form.get("category") ?? ""),
    note: String(form.get("note") ?? ""),
    amount: String(form.get("amount") ?? ""),
    method: form.get("method"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({ ...parsed.data, note: parsed.data.note || null });
  if (error) return fromDbError(error, "Unable to save the expense.");

  revalidatePath("/", "layout");
  return { ok: true, message: "Expense added." };
}

/** Expenses are hard-deleted: the only reason to remove one is that it was entered by mistake. */
export async function deleteExpense(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Unknown expense." };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return fromDbError(error, "Unable to delete the expense.");

  revalidatePath("/", "layout");
  return { ok: true, message: "Expense deleted." };
}

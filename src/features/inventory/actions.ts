"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fromDbError, fromZodError } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/validations/shop.schema";

import type { ActionResult } from "@/types/domain";

const FIELDS = ["id", "category", "brand", "name", "details", "cost", "price", "qty", "low_stock"] as const;

export async function saveItem(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? "")]));
  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const { id, ...values } = parsed.data;
  const row = { ...values, brand: values.brand || null, details: values.details || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("items").update(row).eq("id", id)
    : await supabase.from("items").insert(row);
  if (error) return fromDbError(error, "Unable to save the item.");

  revalidatePath("/inventory");
  return { ok: true, message: id ? "Item updated." : "Item added to stock." };
}

export async function adjustStock(itemId: string, delta: number): Promise<ActionResult<number>> {
  const parsed = z.object({ itemId: z.uuid(), delta: z.number().int().min(-100).max(100) }).safeParse({ itemId, delta });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_stock", { p_item: itemId, p_delta: delta });
  if (error) return fromDbError(error, "Unable to change the stock count.");

  revalidatePath("/inventory");
  return { ok: true, message: "Stock updated.", data: Number(data) };
}

/** Hides the item from stock and search. Past orders keep their description. */
export async function archiveItem(itemId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(itemId).success) return { ok: false, message: "Unknown item." };

  const supabase = await createClient();
  const { error } = await supabase.from("items").update({ archived_at: new Date().toISOString() }).eq("id", itemId);
  if (error) return fromDbError(error, "Unable to remove the item.");

  revalidatePath("/inventory");
  return { ok: true, message: "Item removed from stock." };
}

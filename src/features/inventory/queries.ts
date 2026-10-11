import { toSearchTerm } from "@/lib/format";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { InventoryItem, ItemCategory } from "@/types/domain";

const COLUMNS = "id, category, brand, name, details, cost, price, qty, low_stock";
// ponytail: one screenful per filter; search narrows it. Add paging past a few thousand SKUs.
export const INVENTORY_LIMIT = 300;

function toItem(row: Record<string, unknown>): InventoryItem {
  return { ...(row as unknown as InventoryItem), cost: Number(row.cost), price: Number(row.price) };
}

export async function listItems({
  category,
  query = "",
  lowOnly = false,
}: {
  category?: ItemCategory;
  query?: string;
  lowOnly?: boolean;
}): Promise<InventoryItem[]> {
  const supabase = await createClient();
  let request = supabase.from("items").select(COLUMNS).is("archived_at", null);
  if (category) request = request.eq("category", category);
  if (lowOnly) request = request.eq("is_low", true);
  const q = toSearchTerm(query).toLowerCase();
  if (q) request = request.ilike("search", `%${q}%`);

  const { data, error } = await request.order("brand", { nullsFirst: false }).order("name").limit(INVENTORY_LIMIT);
  if (error) {
    logger.error("Failed to list stock", { code: error.code });
    throw new Error("Unable to load stock.");
  }
  return (data ?? []).map(toItem);
}

export async function getLowStock(limit = 6): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(COLUMNS)
    .is("archived_at", null)
    .eq("is_low", true)
    .order("qty")
    .limit(limit);
  if (error) {
    logger.error("Failed to load low stock", { code: error.code });
    return [];
  }
  return (data ?? []).map(toItem);
}

/** Brands already in use, so the add form can suggest them. */
export async function getBrands(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("brand").not("brand", "is", null).is("archived_at", null).limit(2000);
  if (error) return [];
  const brands = (data ?? []).map((r) => r.brand as string | null).filter((b): b is string => !!b);
  return [...new Set(brands)].sort((a, b) => a.localeCompare(b));
}

export async function getStockSummary(): Promise<{ pieces: number; costValue: number; saleValue: number; low: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("qty, cost, price, is_low").is("archived_at", null);
  if (error) {
    logger.error("Failed to load stock summary", { code: error.code });
    return { pieces: 0, costValue: 0, saleValue: 0, low: 0 };
  }
  return (data ?? []).reduce(
    (s, i) => {
      const qty = Math.max(0, Number(i.qty));
      return {
        pieces: s.pieces + qty,
        costValue: s.costValue + qty * Number(i.cost),
        saleValue: s.saleValue + qty * Number(i.price),
        low: s.low + (i.is_low ? 1 : 0),
      };
    },
    { pieces: 0, costValue: 0, saleValue: 0, low: 0 },
  );
}

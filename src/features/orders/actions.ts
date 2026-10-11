"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fromDbError, fromZodError } from "@/lib/action-result";
import { digitsOnly, toSearchTerm } from "@/lib/format";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_VALUES } from "@/lib/validations/common";
import {
  orderSchema,
  paymentSchema,
  statusSchema,
  toCreateOrderPayload,
  type OrderFormValues,
} from "@/lib/validations/order.schema";

import type { ActionResult, InventoryItem, PaymentMethod, Rx, RxSource } from "@/types/domain";

export async function createOrder(values: OrderFormValues): Promise<ActionResult> {
  const parsed = orderSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", { p: toCreateOrderPayload(parsed.data) });
  if (error) return fromDbError(error, "Unable to save the order. Please try again.");

  const { id, order_no } = data as { id: string; order_no: number };
  logger.info("Order created", { order_no });
  revalidatePath("/", "layout");
  redirect(`/orders/${id}?new=1`);
}

export async function setOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ order_id: orderId, status });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", { p_order: orderId, p_status: parsed.data.status });
  if (error) return fromDbError(error, "Unable to update the order.");

  revalidatePath("/", "layout");
  return { ok: true, message: "Order updated." };
}

export async function deliverOrder(orderId: string, method: PaymentMethod): Promise<ActionResult<number>> {
  const parsed = z
    .object({ orderId: z.uuid(), method: z.enum(PAYMENT_METHOD_VALUES) })
    .safeParse({ orderId, method });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deliver_order", { p_order: orderId, p_method: method });
  if (error) return fromDbError(error, "Unable to mark the order delivered.");

  revalidatePath("/", "layout");
  return { ok: true, message: "Delivered.", data: Number(data) };
}

export async function addPayment(input: { order_id: string; amount: string; method: string }): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert(parsed.data);
  if (error) return fromDbError(error, "Unable to record the payment.");

  revalidatePath("/", "layout");
  return { ok: true, message: "Payment recorded." };
}

// ─── Lookups used while filling the order form ──────────────────────────────

export interface CustomerMatch {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  lastVisit: string | null;
  lastRx: Rx | null;
  lastRxSource: RxSource | null;
}

export async function findCustomersByPhone(phone: string): Promise<CustomerMatch[]> {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, address, orders(order_date, rx, rx_source)")
    .like("phone", `%${digits}%`)
    .order("updated_at", { ascending: false })
    .order("order_date", { referencedTable: "orders", ascending: false })
    .limit(1, { referencedTable: "orders" })
    .limit(6);

  if (error) {
    logger.error("Customer lookup failed", { code: error.code });
    return [];
  }
  return (data ?? []).map((c) => {
    const last = (c.orders as { order_date: string; rx: Rx | null; rx_source: RxSource }[])[0];
    return {
      id: c.id as string,
      name: c.name as string,
      phone: c.phone as string,
      address: c.address as string | null,
      lastVisit: last?.order_date ?? null,
      lastRx: last?.rx ?? null,
      lastRxSource: last?.rx_source ?? null,
    };
  });
}

export async function findStockItems(query: string): Promise<InventoryItem[]> {
  const q = toSearchTerm(query).toLowerCase();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, category, brand, name, details, cost, price, qty, low_stock")
    .is("archived_at", null)
    .ilike("search", `%${q}%`)
    .order("qty", { ascending: false })
    .limit(8);

  if (error) {
    logger.error("Stock lookup failed", { code: error.code });
    return [];
  }
  return (data ?? []).map((i) => ({ ...(i as InventoryItem), price: Number(i.price), cost: Number(i.cost) }));
}

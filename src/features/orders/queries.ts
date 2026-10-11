import { PAGE_SIZE } from "@/constants/app";
import { digitsOnly, toSearchTerm } from "@/lib/format";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { CustomerMatch } from "@/features/orders/actions";
import type { Customer, OrderDetail, OrderListRow, OrderStatus, Rx, RxSource } from "@/types/domain";

const LIST_COLUMNS =
  "id, order_no, order_date, delivery_date, status, total, lens_source, customer_id, customer_name, customer_phone, paid, balance";

// Postgres numerics arrive as strings or numbers depending on size; normalise once here.
function toListRow(row: Record<string, unknown>): OrderListRow {
  return { ...(row as unknown as OrderListRow), total: Number(row.total), paid: Number(row.paid), balance: Number(row.balance) };
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_no, order_date, delivery_date, status, rx_source, rx, prescribed_by, checked_by, lens_source, lab_name, subtotal, discount, total, remarks, share_token, delivered_at, created_at, customer:customers(id, name, phone, address, created_at), items:order_items(id, item_id, description, qty, price), payments(id, amount, method, paid_on, created_at)",
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "order_items" })
    .order("created_at", { referencedTable: "payments" })
    .maybeSingle();

  if (error) {
    logger.error("Failed to load order", { id, code: error.code });
    throw new Error("Unable to load this order.");
  }
  if (!data) return null;

  const order = data as unknown as OrderDetail;
  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    items: order.items.map((i) => ({ ...i, price: Number(i.price) })),
    payments: order.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  };
}

interface ListOrdersParams {
  status?: OrderStatus | "open" | "due";
  query?: string;
  page?: number;
  today?: string;
}

export async function listOrders({ status, query = "", page = 1, today }: ListOrdersParams): Promise<{
  rows: OrderListRow[];
  hasMore: boolean;
}> {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  let request = supabase.from("order_list").select(LIST_COLUMNS);

  if (status === "open") request = request.in("status", ["pending", "at_lab", "ready"]);
  else if (status === "due" && today) request = request.in("status", ["pending", "at_lab", "ready"]).lte("delivery_date", today);
  else if (status) request = request.eq("status", status);

  const q = toSearchTerm(query);
  if (q) {
    const digits = digitsOnly(q);
    const filters = [`customer_name.ilike."*${q}*"`];
    if (digits.length >= 3) filters.push(`customer_phone.like."*${digits}*"`);
    if (/^\d{1,9}$/.test(q)) filters.push(`order_no.eq.${q}`);
    request = request.or(filters.join(","));
  }

  const sortByDelivery = status === "open" || status === "due" || status === "ready" || status === "at_lab";
  request = sortByDelivery
    ? request.order("delivery_date", { ascending: true, nullsFirst: false }).order("order_no")
    : request.order("order_no", { ascending: false });

  // Fetch one extra row to know whether a next page exists without a count query.
  const { data, error } = await request.range(from, from + PAGE_SIZE);
  if (error) {
    logger.error("Failed to list orders", { code: error.code });
    throw new Error("Unable to load orders.");
  }
  const rows = (data ?? []).map(toListRow);
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

/** A customer plus their latest prescription, for starting a repeat order. */
export async function getCustomerForNewOrder(id: string): Promise<CustomerMatch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, address, orders(order_date, rx, rx_source)")
    .eq("id", id)
    .order("order_date", { referencedTable: "orders", ascending: false })
    .limit(1, { referencedTable: "orders" })
    .maybeSingle();
  if (error || !data) return null;

  const last = (data.orders as { order_date: string; rx: Rx | null; rx_source: RxSource }[])[0];
  return {
    id: data.id as string,
    name: data.name as string,
    phone: data.phone as string,
    address: data.address as string | null,
    lastVisit: last?.order_date ?? null,
    lastRx: last?.rx ?? null,
    lastRxSource: last?.rx_source ?? null,
  };
}

export async function getOutstandingBalance(): Promise<{ amount: number; orders: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("order_list").select("balance").neq("status", "cancelled").gt("balance", 0);
  if (error) {
    logger.error("Failed to load outstanding balance", { code: error.code });
    return { amount: 0, orders: 0 };
  }
  return { amount: (data ?? []).reduce((sum, r) => sum + Number(r.balance), 0), orders: data?.length ?? 0 };
}

export interface CustomerOrder {
  id: string;
  order_no: number;
  order_date: string;
  status: OrderStatus;
  total: number;
  rx: Rx | null;
  rx_source: RxSource;
  items: { description: string }[];
}

export async function getCustomerHistory(id: string): Promise<{
  customer: Customer;
  orders: CustomerOrder[];
  balances: Map<string, number>;
} | null> {
  const supabase = await createClient();
  const [customer, orders, balances] = await Promise.all([
    supabase.from("customers").select("id, name, phone, address, created_at").eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_no, order_date, status, total, rx, rx_source, items:order_items(description)")
      .eq("customer_id", id)
      .order("order_date", { ascending: false })
      .order("order_no", { ascending: false }),
    supabase.from("order_list").select("id, balance").eq("customer_id", id),
  ]);

  const error = customer.error ?? orders.error ?? balances.error;
  if (error) {
    logger.error("Failed to load customer", { id, code: error.code });
    throw new Error("Unable to load this customer.");
  }
  if (!customer.data) return null;

  return {
    customer: customer.data as Customer,
    orders: (orders.data ?? []).map((o) => ({ ...(o as unknown as CustomerOrder), total: Number(o.total) })),
    balances: new Map((balances.data ?? []).map((b) => [b.id as string, Number(b.balance)])),
  };
}

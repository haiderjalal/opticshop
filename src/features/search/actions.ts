"use server";

import { digitsOnly, toSearchTerm } from "@/lib/format";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { OrderStatus } from "@/types/domain";

export interface SearchHit {
  kind: "customer" | "order";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  status?: OrderStatus;
}

/** Finds customers by name or phone, and orders by number. */
export async function searchEverything(query: string): Promise<SearchHit[]> {
  const q = toSearchTerm(query);
  const digits = digitsOnly(q);
  if (q.length < 2) return [];

  const supabase = await createClient();
  const filters = [`name.ilike."*${q}*"`];
  if (digits.length >= 3) filters.push(`phone.like."*${digits}*"`);

  const [customers, orders] = await Promise.all([
    supabase.from("customers").select("id, name, phone").or(filters.join(",")).order("name").limit(8),
    /^\d{1,9}$/.test(q)
      ? supabase.from("order_list").select("id, order_no, customer_name, status").eq("order_no", Number(q)).limit(1)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (customers.error || orders.error) {
    logger.error("Search failed", { code: customers.error?.code ?? orders.error?.code });
    return [];
  }

  const orderHits: SearchHit[] = (orders.data ?? []).map((o) => ({
    kind: "order",
    id: o.id as string,
    title: `Order #${o.order_no}`,
    subtitle: o.customer_name as string,
    href: `/orders/${o.id}`,
    status: o.status as OrderStatus,
  }));
  const customerHits: SearchHit[] = (customers.data ?? []).map((c) => ({
    kind: "customer",
    id: c.id as string,
    title: c.name as string,
    subtitle: c.phone as string,
    href: `/customers/${c.id}`,
  }));
  return [...orderHits, ...customerHits];
}

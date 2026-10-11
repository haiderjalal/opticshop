import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderRows } from "@/features/orders/components/OrderRows";
import { listOrders } from "@/features/orders/queries";
import { getSettings } from "@/features/settings/queries";
import { todayIn } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { OrderStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Orders" };

type Filter = OrderStatus | "open" | "due" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "due", label: "Due / late" },
  { value: "pending", label: "Booked" },
  { value: "at_lab", label: "At lab" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const params = await searchParams;
  const q = one(params.q).slice(0, 60);
  const statusParam = one(params.status);
  const filter: Filter = FILTERS.some((f) => f.value === statusParam) ? (statusParam as Filter) : "all";
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(params.page), 10) || 1));

  const settings = await getSettings();
  const today = todayIn(settings.timezone);
  const { rows, hasMore } = await listOrders({ status: filter === "all" ? undefined : filter, query: q, page, today });

  const href = (next: { status?: Filter; page?: number }) => {
    const sp = new URLSearchParams();
    const status = next.status ?? filter;
    if (status !== "all") sp.set("status", status);
    if (q) sp.set("q", q);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    const s = sp.toString();
    return s ? `/orders?${s}` : "/orders";
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Search by customer name, phone or order number."
        actions={
          <Link href="/orders/new" className={cn(buttonVariants({ size: "lg" }), "rounded-xl")}>
            <PlusIcon /> New order
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <form action="/orders" className="relative lg:w-80">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Name, phone or #" aria-label="Search orders" className="pl-9" />
        </form>
        <nav aria-label="Filter by status" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={href({ status: f.value })}
              aria-current={f.value === filter ? "page" : undefined}
              className={cn(
                "h-9 shrink-0 content-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                f.value === filter ? "border-transparent bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="card-surface overflow-hidden">
        {rows.length ? (
          <OrderRows rows={rows} currency={settings.currency} today={today} showDue={filter === "open" || filter === "due" || filter === "ready" || filter === "at_lab" || filter === "pending"} />
        ) : (
          <EmptyState title={q ? `No orders match “${q}”` : "No orders here yet"}>
            {q ? "Try the phone number or order number instead." : "New orders show up here as soon as they are saved."}
          </EmptyState>
        )}
      </section>

      {(page > 1 || hasMore) && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className={buttonVariants({ variant: "outline" })}>
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {hasMore ? (
            <Link href={href({ page: page + 1 })} className={buttonVariants({ variant: "outline" })}>
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

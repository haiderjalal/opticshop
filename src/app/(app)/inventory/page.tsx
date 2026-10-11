import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { ITEM_CATEGORIES } from "@/constants/app";
import { ItemDialog } from "@/features/inventory/components/ItemDialog";
import { QtyStepper } from "@/features/inventory/components/QtyStepper";
import { INVENTORY_LIMIT, getBrands, getStockSummary, listItems } from "@/features/inventory/queries";
import { getSettings } from "@/features/settings/queries";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ItemCategory } from "@/types/domain";

export const metadata: Metadata = { title: "Stock" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const params = await searchParams;
  const q = one(params.q).slice(0, 60);
  const cat = one(params.category);
  const category = cat in ITEM_CATEGORIES ? (cat as ItemCategory) : undefined;
  const lowOnly = one(params.low) === "1";

  const [settings, items, summary, brands] = await Promise.all([
    getSettings(),
    listItems({ category, query: q, lowOnly }),
    getStockSummary(),
    getBrands(),
  ]);
  const money = (n: number) => formatMoney(n, settings.currency);

  const href = (next: { category?: ItemCategory | null; low?: boolean }) => {
    const sp = new URLSearchParams();
    const c = next.category === undefined ? category : next.category;
    const low = next.low ?? lowOnly;
    if (c) sp.set("category", c);
    if (low) sp.set("low", "1");
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/inventory?${s}` : "/inventory";
  };

  const chips: { label: string; href: string; active: boolean }[] = [
    { label: "All", href: href({ category: null }), active: !category },
    ...(Object.keys(ITEM_CATEGORIES) as ItemCategory[]).map((c) => ({
      label: ITEM_CATEGORIES[c],
      href: href({ category: c }),
      active: c === category,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Stock"
        description={`${summary.pieces.toLocaleString("en-US")} pieces · worth ${money(summary.saleValue)} at sale price (${money(summary.costValue)} cost)`}
        actions={<ItemDialog brands={brands} defaultCategory={category} defaultOpen={one(params.add) === "1"} />}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <form action="/inventory" className="relative lg:w-80">
          {category && <input type="hidden" name="category" value={category} />}
          {lowOnly && <input type="hidden" name="low" value="1" />}
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Brand, model, colour…" aria-label="Search stock" className="pl-9" />
        </form>
        <nav aria-label="Filter stock" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              aria-current={chip.active ? "page" : undefined}
              className={cn(
                "h-9 shrink-0 content-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                chip.active ? "border-transparent bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </Link>
          ))}
          <Link
            href={href({ low: !lowOnly })}
            aria-current={lowOnly ? "page" : undefined}
            className={cn(
              "h-9 shrink-0 content-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
              lowOnly ? "border-transparent bg-status-pending text-white" : "bg-card text-status-pending",
            )}
          >
            Low stock · {summary.low}
          </Link>
        </nav>
      </div>

      <section className="card-surface overflow-hidden">
        {items.length ? (
          <ul className="stagger divide-y">
            {items.map((item) => {
              const title = [item.brand, item.name].filter(Boolean).join(" ");
              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_11rem_2.5rem] sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ITEM_CATEGORIES[item.category]}
                      {item.details && ` · ${item.details}`}
                    </p>
                  </div>
                  <p className="text-right text-sm font-semibold sm:order-none">{money(item.price)}</p>
                  <div className="flex items-center gap-2">
                    <QtyStepper itemId={item.id} qty={item.qty} lowStock={item.low_stock} label={title} />
                    {item.qty < 0 && <span className="text-xs font-semibold text-destructive">Recount</span>}
                  </div>
                  <ItemDialog item={item} brands={brands} />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title={q || category || lowOnly ? "Nothing matches" : "No stock yet"}>
            {q || category || lowOnly ? "Clear the filters or try another word." : "Add frames, sunglasses and lenses to pick them straight into orders."}
          </EmptyState>
        )}
      </section>
      {items.length === INVENTORY_LIMIT && (
        <p className="mt-3 text-center text-sm text-muted-foreground">Showing the first {INVENTORY_LIMIT} items. Search to narrow down.</p>
      )}
    </>
  );
}

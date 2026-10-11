import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleIcon, PhoneIcon, PlusIcon } from "lucide-react";
import { z } from "zod";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { getCustomerHistory } from "@/features/orders/queries";
import { getSettings } from "@/features/settings/queries";
import { formatDate, formatMoney, formatRx, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { RxEye } from "@/types/domain";

export const metadata: Metadata = { title: "Customer" };

function eyeSummary(eye: RxEye): string {
  const parts = [formatRx(eye.sph), eye.cyl ? `${formatRx(eye.cyl)} × ${eye.axis ?? "?"}°` : "", eye.add ? `Add ${formatRx(eye.add)}` : ""];
  return parts.filter(Boolean).join("  ") || "—";
}

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [history, settings] = await Promise.all([getCustomerHistory(id), getSettings()]);
  if (!history) notFound();

  const { customer, orders, balances } = history;
  const money = (n: number) => formatMoney(n, settings.currency);
  const live = orders.filter((o) => o.status !== "cancelled");
  const spent = live.reduce((sum, o) => sum + o.total, 0);
  const owed = live.reduce((sum, o) => sum + Math.max(0, balances.get(o.id) ?? 0), 0);
  const withRx = orders.filter((o) => o.rx);
  const chat = whatsappLink(customer.phone, settings.country_code, `Dear ${customer.name}, `);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium text-muted-foreground">Customer since {formatDate(customer.created_at)}</p>
          <h1 className="text-3xl font-bold sm:text-[2.1rem]">{customer.name}</h1>
          <p className="font-mono text-muted-foreground">{customer.phone}</p>
          {customer.address && <p className="mt-1 text-sm text-muted-foreground">{customer.address}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${customer.phone}`} aria-label="Call" className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "size-11 rounded-xl")}>
            <PhoneIcon />
          </a>
          <a href={chat} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl")}>
            <MessageCircleIcon /> WhatsApp
          </a>
          <Link href={`/orders/new?customer=${customer.id}`} className={cn(buttonVariants({ size: "lg" }), "glint rounded-xl")}>
            <PlusIcon /> New order
          </Link>
        </div>
      </div>

      <dl className="card-surface stagger grid grid-cols-3 divide-x">
        {[
          { label: "Visits", value: String(live.length) },
          { label: "Total spent", value: money(spent) },
          { label: "Balance due", value: money(owed), tone: owed > 0 ? "text-status-pending" : undefined },
        ].map((stat) => (
          <div key={stat.label} className="p-4 sm:p-6">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className={cn("mt-1 font-heading text-xl font-bold sm:text-2xl", stat.tone)}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {withRx.length > 0 && (
        <section aria-labelledby="rx-history" className="card-surface p-5 sm:p-6">
          <h2 id="rx-history" className="mb-1 text-lg font-semibold">
            Prescription history
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Newest first — spot power changes at a glance.</p>
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Right</th>
                  <th className="pb-2 font-medium">Left</th>
                  <th className="pb-2 font-medium">PD</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {withRx.map((o) =>
                  o.rx ? (
                    <tr key={o.id} className="border-t">
                      <td className="py-2.5 pr-4 font-sans">
                        <Link href={`/orders/${o.id}`} className="underline-offset-4 hover:underline">
                          {formatDate(o.order_date)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-pre">{eyeSummary(o.rx.r)}</td>
                      <td className="py-2.5 pr-4 whitespace-pre">{eyeSummary(o.rx.l)}</td>
                      <td className="py-2.5">{[o.rx.r.pd, o.rx.l.pd].filter((v) => v !== null).join(" / ") || "—"}</td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="visits" className="card-surface overflow-hidden">
        <h2 id="visits" className="px-5 pt-5 pb-3 text-lg font-semibold sm:px-6">
          Orders
        </h2>
        {orders.length ? (
          <ul className="stagger divide-y">
            {orders.map((o) => {
              const balance = balances.get(o.id) ?? 0;
              return (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60 sm:px-6"
                  >
                    <span className="font-mono text-sm font-semibold">#{o.order_no}</span>
                    <span className="min-w-0">
                      <span className="block truncate">{o.items.map((i) => i.description).join(" · ")}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(o.order_date)}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <StatusBadge status={o.status} />
                      <span className="text-sm font-semibold">
                        {money(o.total)}
                        {balance > 0 && o.status !== "cancelled" && (
                          <span className="ml-2 text-xs text-status-pending">{money(balance)} due</span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No orders yet" />
        )}
      </section>
    </div>
  );
}

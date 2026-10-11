import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDownIcon, MessageCircleIcon, PartyPopperIcon, PhoneIcon, PlusIcon } from "lucide-react";
import { z } from "zod";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { PAYMENT_METHODS } from "@/constants/app";
import { DueLabel } from "@/features/orders/components/DueLabel";
import { OrderActions } from "@/features/orders/components/OrderActions";
import { RxView } from "@/features/orders/components/RxView";
import { StatusTrack } from "@/features/orders/components/StatusTrack";
import { getOrder } from "@/features/orders/queries";
import { invoiceMessage, readyMessage } from "@/features/orders/whatsapp";
import { getOrigin, getSettings } from "@/features/settings/queries";
import { formatDate, formatInstant, formatMoney, todayIn, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

const RX_SOURCE_LABEL = { own: "Customer's own prescription", tested: "Eye test in shop", none: "No prescription" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [order, settings, origin] = await Promise.all([getOrder(id), getSettings(), getOrigin()]);
  if (!order) notFound();

  const money = (n: number) => formatMoney(n, settings.currency);
  const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, order.total - paid);
  const today = todayIn(settings.timezone);
  const isOpen = order.status !== "delivered" && order.status !== "cancelled";
  const pdfUrl = `/i/${order.share_token}`;

  const context = {
    shopName: settings.shop_name,
    shopPhone: settings.phone,
    currency: settings.currency,
    customerName: order.customer.name,
    orderNo: order.order_no,
  };
  const invoiceLink = whatsappLink(
    order.customer.phone,
    settings.country_code,
    invoiceMessage({ ...context, total: order.total, paid, deliveryDate: order.delivery_date, invoiceUrl: `${origin}${pdfUrl}` }),
  );
  const readyLink = whatsappLink(order.customer.phone, settings.country_code, readyMessage({ ...context, balance }));

  return (
    <div className="space-y-5">
      {query.new === "1" && (
        <div className="relative overflow-hidden rounded-2xl p-[1.5px] coating animate-in fade-in-0 zoom-in-95 duration-500">
          <div className="flex flex-wrap items-center gap-4 rounded-[calc(1rem-1.5px)] bg-card px-5 py-4">
            <PartyPopperIcon className="size-6 text-coat-violet" />
            <div className="mr-auto">
              <p className="font-heading text-lg font-bold">Order #{order.order_no} saved</p>
              <p className="text-sm text-muted-foreground">Send the invoice while the customer is still at the counter.</p>
            </div>
            <a href={invoiceLink} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "glint rounded-xl")}>
              <MessageCircleIcon /> Send invoice on WhatsApp
            </a>
            <Link href="/orders/new" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-xl")}>
              <PlusIcon /> Next order
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">Booked {formatDate(order.order_date)}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold sm:text-[2.1rem]">
              Order <span className="font-mono">#{order.order_no}</span>
            </h1>
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={invoiceLink} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl")}>
            <MessageCircleIcon /> WhatsApp invoice
          </a>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl")}>
            <FileDownIcon /> Invoice PDF
          </a>
        </div>
      </div>

      <section aria-label="Progress" className="card-surface space-y-6 p-5 sm:p-6">
        <StatusTrack status={order.status} lensSource={order.lens_source} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <OrderActions
            orderId={order.id}
            status={order.status}
            lensSource={order.lens_source}
            balance={balance}
            currency={settings.currency}
          />
          {order.status === "ready" && (
            <a
              href={readyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-success underline-offset-4 hover:underline"
            >
              <MessageCircleIcon className="size-4" /> Tell {order.customer.name.split(" ")[0]} it&apos;s ready
            </a>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="stagger min-w-0 space-y-5">
          <section aria-labelledby="customer-heading" className="card-surface flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <h2 id="customer-heading" className="text-xl font-bold">
                <Link href={`/customers/${order.customer.id}`} className="underline-offset-4 hover:underline">
                  {order.customer.name}
                </Link>
              </h2>
              <p className="font-mono text-sm text-muted-foreground">{order.customer.phone}</p>
              {order.customer.address && <p className="mt-1 text-sm text-muted-foreground">{order.customer.address}</p>}
            </div>
            <div className="flex gap-2">
              <a href={`tel:${order.customer.phone}`} aria-label={`Call ${order.customer.name}`} className={buttonVariants({ variant: "outline", size: "icon-lg" })}>
                <PhoneIcon />
              </a>
              <Link href={`/customers/${order.customer.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                All visits
              </Link>
            </div>
          </section>

          <section aria-labelledby="rx-heading" className="card-surface p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="rx-heading" className="text-lg font-semibold">
                Prescription
              </h2>
              <span className="text-sm text-muted-foreground">{RX_SOURCE_LABEL[order.rx_source]}</span>
            </div>
            {order.rx ? <RxView rx={order.rx} /> : <p className="text-sm text-muted-foreground">No prescription on this order.</p>}
            {(order.prescribed_by || order.checked_by) && (
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t pt-4 text-sm">
                {order.prescribed_by && (
                  <div>
                    <dt className="text-muted-foreground">Prescribed by</dt>
                    <dd className="font-medium">{order.prescribed_by}</dd>
                  </div>
                )}
                {order.checked_by && (
                  <div>
                    <dt className="text-muted-foreground">Checked by</dt>
                    <dd className="font-medium">{order.checked_by}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          <section aria-labelledby="items-heading" className="card-surface p-5 sm:p-6">
            <h2 id="items-heading" className="mb-3 text-lg font-semibold">
              Items
            </h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="py-2.5 pr-3">
                      {item.description}
                      {item.item_id && <span className="ml-2 text-xs text-success">from stock</span>}
                    </td>
                    <td className="py-2.5 text-right">{item.qty}</td>
                    <td className="py-2.5 text-right font-medium">{money(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="stagger space-y-5">
          <section aria-labelledby="money-heading" className="card-surface p-5 sm:p-6">
            <h2 id="money-heading" className="mb-3 text-lg font-semibold">
              Payment
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd>−{money(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{money(order.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid</dt>
                <dd>{money(paid)}</dd>
              </div>
            </dl>
            <div
              className={cn(
                "mt-3 flex items-center justify-between rounded-xl px-4 py-3",
                balance > 0 ? "bg-status-pending/10 text-status-pending" : "bg-success/10 text-success",
              )}
            >
              <span className="text-sm font-semibold">{balance > 0 ? "Balance due" : "Fully paid"}</span>
              <span className="font-heading text-xl font-bold">{money(balance)}</span>
            </div>
            {order.payments.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex justify-between text-muted-foreground">
                    <span>
                      {formatDate(p.paid_on, true)} · {PAYMENT_METHODS[p.method]}
                    </span>
                    <span className="font-medium text-foreground">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="delivery-heading" className="card-surface p-5 sm:p-6">
            <h2 id="delivery-heading" className="mb-3 text-lg font-semibold">
              Delivery
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Promised for</dt>
                <dd className="text-right">
                  <span className="font-medium">{formatDate(order.delivery_date)}</span>
                  {isOpen && <DueLabel date={order.delivery_date} today={today} className="block" />}
                </dd>
              </div>
              {order.delivered_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivered</dt>
                  <dd className="font-medium">{formatInstant(order.delivered_at, settings.timezone)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Lenses</dt>
                <dd className="text-right font-medium">
                  {order.lens_source === "lab" ? `From lab${order.lab_name ? ` · ${order.lab_name}` : ""}` : "From stock"}
                </dd>
              </div>
              {order.remarks && (
                <div className="border-t pt-3">
                  <dt className="mb-1 text-muted-foreground">Remarks</dt>
                  <dd className="whitespace-pre-line">{order.remarks}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

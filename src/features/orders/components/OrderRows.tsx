import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { DueLabel } from "@/features/orders/components/DueLabel";
import { formatDate, formatMoney } from "@/lib/format";

import type { OrderListRow } from "@/types/domain";

interface OrderRowsProps {
  rows: OrderListRow[];
  currency: string;
  today: string;
  /** Show how soon delivery is due instead of the booking date. */
  showDue?: boolean;
}

export function OrderRows({ rows, currency, today, showDue = false }: OrderRowsProps) {
  return (
    <ul className="stagger divide-y">
      {rows.map((o) => {
        const open = o.status !== "delivered" && o.status !== "cancelled";
        return (
          <li key={o.id}>
            <Link
              href={`/orders/${o.id}`}
              className="group grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/60 sm:grid-cols-[4.75rem_minmax(0,1fr)_7rem_7.5rem_1rem] sm:px-5"
            >
              <span className="font-mono text-sm font-semibold">#{o.order_no}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{o.customer_name}</span>
                <span className="block font-mono text-xs text-muted-foreground">{o.customer_phone}</span>
              </span>
              <span className="flex flex-col items-end gap-1 sm:items-start">
                <StatusBadge status={o.status} />
                {showDue && open ? (
                  <DueLabel date={o.delivery_date} today={today} />
                ) : (
                  <span className="text-xs text-muted-foreground">{formatDate(o.order_date, true)}</span>
                )}
              </span>
              <span className="col-start-2 text-sm sm:col-start-auto sm:text-right">
                <span className="font-semibold">{formatMoney(o.total, currency)}</span>
                {o.balance > 0 && o.status !== "cancelled" && (
                  <span className="block text-xs font-semibold text-status-pending">
                    {formatMoney(o.balance, currency)} due
                  </span>
                )}
              </span>
              <ChevronRightIcon className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

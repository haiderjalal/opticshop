"use client";

import { useFormState, useWatch, type UseFormReturn } from "react-hook-form";
import { Loader2Icon, SaveIcon } from "lucide-react";

import { Segmented } from "@/components/shared/Segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS } from "@/constants/app";
import { addDays, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { orderSubtotal, type OrderFormValues, type OrderInput } from "@/lib/validations/order.schema";

import type { PaymentMethod } from "@/types/domain";

const METHOD_OPTIONS = Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value: value as PaymentMethod, label }));

const DELIVERY_SHORTCUTS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
];

function toAmount(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

interface OrderSummaryProps {
  form: UseFormReturn<OrderFormValues, unknown, OrderInput>;
  currency: string;
  submitting: boolean;
}

export function OrderSummary({ form, currency, submitting }: OrderSummaryProps) {
  const { control, register, setValue } = form;
  const formState = useFormState({ control });
  const { errors } = formState;
  const [items, discount, advance, method, orderDate, deliveryDate] = useWatch({
    control,
    name: ["items", "discount", "advance", "method", "order_date", "delivery_date"],
  });

  const subtotal = orderSubtotal((items ?? []).map((l) => ({ qty: toAmount(l.qty), price: toAmount(l.price) })));
  const total = Math.max(0, subtotal - toAmount(discount));
  const balance = Math.max(0, total - toAmount(advance));
  const money = (n: number) => formatMoney(n, currency);

  const setAdvance = (amount: number) => setValue("advance", amount ? String(amount) : "", { shouldValidate: formState.isSubmitted });

  return (
    <aside aria-label="Order summary" className="card-surface space-y-5 p-5 sm:p-6 lg:sticky lg:top-24">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="order_date">Order date</Label>
          <Input id="order_date" type="date" {...register("order_date")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="delivery_date">Delivery</Label>
          <Input id="delivery_date" type="date" aria-invalid={!!errors.delivery_date || undefined} {...register("delivery_date")} />
        </div>
        <div className="col-span-2 flex flex-wrap gap-1.5">
          {DELIVERY_SHORTCUTS.map(({ label, days }) => {
            const date = orderDate ? addDays(orderDate, days) : "";
            return (
              <button
                key={label}
                type="button"
                onClick={() => setValue("delivery_date", date, { shouldValidate: formState.isSubmitted })}
                className={cn(
                  "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors hover:border-ring/50",
                  date === deliveryDate ? "border-transparent bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        {errors.delivery_date && <p className="col-span-2 text-sm text-destructive">{errors.delivery_date.message}</p>}
      </div>

      <dl className="space-y-2.5 border-t pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium">{money(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>
            <Label htmlFor="discount" className="font-normal text-muted-foreground">
              Discount
            </Label>
          </dt>
          <dd className="w-32">
            <Input
              id="discount"
              inputMode="decimal"
              placeholder="0"
              className="h-9 text-right"
              aria-invalid={!!errors.discount || undefined}
              {...register("discount")}
            />
          </dd>
        </div>
        {errors.discount && <p className="text-right text-sm text-destructive">{errors.discount.message}</p>}
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">Total</dt>
          <dd className="font-heading text-2xl font-bold">{money(total)}</dd>
        </div>
      </dl>

      <div className="space-y-3 border-t pt-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="advance">Advance paid now</Label>
            <Input
              id="advance"
              inputMode="decimal"
              placeholder="0"
              className="text-right"
              aria-invalid={!!errors.advance || undefined}
              {...register("advance")}
            />
          </div>
          <div className="flex gap-1.5 pb-0.5">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdvance(total)}>
              Full
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAdvance(Math.round(total / 2))}>
              Half
            </Button>
          </div>
        </div>
        {errors.advance && <p className="text-sm text-destructive">{errors.advance.message}</p>}
        <Segmented
          label="Payment method"
          value={method}
          onChange={(v) => setValue("method", v)}
          options={METHOD_OPTIONS}
        />
        <div
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3 transition-colors",
            total === 0 ? "bg-muted text-muted-foreground" : balance > 0 ? "bg-status-pending/10 text-status-pending" : "bg-success/10 text-success",
          )}
        >
          <span className="text-sm font-semibold">{total > 0 && balance === 0 ? "Fully paid" : "Balance on delivery"}</span>
          <span className="font-heading text-lg font-bold">{money(balance)}</span>
        </div>
      </div>

      <div className="space-y-1.5 border-t pt-5">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" rows={2} placeholder="Anything the lab or the customer should know" {...register("remarks")} />
      </div>

      <Button type="submit" size="lg" className="glint w-full rounded-xl" disabled={submitting}>
        {submitting ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
        Save order
        <kbd className="ml-auto hidden rounded bg-white/15 px-1.5 font-mono text-[11px] sm:inline">Ctrl ↵</kbd>
      </Button>
    </aside>
  );
}

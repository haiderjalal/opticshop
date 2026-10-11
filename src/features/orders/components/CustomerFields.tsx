"use client";

import { useFormState, type UseFormReturn } from "react-hook-form";
import { HistoryIcon, UserRoundCheckIcon } from "lucide-react";

import { SuggestInput } from "@/components/shared/SuggestInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findCustomersByPhone, type CustomerMatch } from "@/features/orders/actions";
import { formatDate } from "@/lib/format";
import type { OrderFormValues, OrderInput } from "@/lib/validations/order.schema";

interface CustomerFieldsProps {
  form: UseFormReturn<OrderFormValues, unknown, OrderInput>;
  returning: CustomerMatch | null;
  onPick: (customer: CustomerMatch) => void;
  onUseLastRx: () => void;
}

export function CustomerFields({ form, returning, onPick, onUseLastRx }: CustomerFieldsProps) {
  const { register, control } = form;
  // useFormState (not form.formState) so this memoised child re-renders when errors change.
  const { errors } = useFormState({ control });

  return (
    <section aria-labelledby="customer-title" className="card-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="customer-title" className="text-lg font-semibold">
          Customer
        </h2>
        {returning && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground animate-in fade-in-0 zoom-in-95">
            <UserRoundCheckIcon className="size-3.5" />
            Returning · last visit {formatDate(returning.lastVisit)}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <SuggestInput<CustomerMatch>
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="0300 1234567"
            autoFocus
            minChars={4}
            aria-invalid={!!errors.phone || undefined}
            {...register("phone")}
            fetchSuggestions={findCustomersByPhone}
            getKey={(c) => c.id}
            onPick={onPick}
            renderSuggestion={(c) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>
                </div>
                {c.lastVisit && (
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(c.lastVisit, true)}</span>
                )}
              </div>
            )}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="off" aria-invalid={!!errors.name || undefined} {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">
            Address <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="address" autoComplete="off" {...register("address")} />
        </div>
      </div>

      {returning?.lastRx && (
        <button
          type="button"
          onClick={onUseLastRx}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-ring/40 bg-accent/50 px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent"
        >
          <HistoryIcon className="size-4" />
          Use last prescription ({formatDate(returning.lastVisit)})
        </button>
      )}
    </section>
  );
}

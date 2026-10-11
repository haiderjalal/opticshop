"use client";

import { useFieldArray, useFormState, useWatch, type UseFormReturn } from "react-hook-form";
import { PackageCheckIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";

import { Segmented } from "@/components/shared/Segmented";
import { SuggestInput } from "@/components/shared/SuggestInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ITEM_CATEGORIES } from "@/constants/app";
import { findStockItems } from "@/features/orders/actions";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderFormValues, OrderInput } from "@/lib/validations/order.schema";

import type { InventoryItem, LensSource } from "@/types/domain";

export const EMPTY_LINE = { item_id: "", description: "", qty: "1", price: "" };

const PLACEHOLDERS = ["Frame — search stock or type", "Lenses — search stock or type"];

const LENS_SOURCES: { value: LensSource; label: string }[] = [
  { value: "stock", label: "Lenses in stock" },
  { value: "lab", label: "Order from lab" },
];

function describe(item: InventoryItem): string {
  return [item.brand, item.name, item.details].filter(Boolean).join(" ");
}

export function ItemLines({ form, currency }: { form: UseFormReturn<OrderFormValues, unknown, OrderInput>; currency: string }) {
  const { control, register, setValue } = form;
  const formState = useFormState({ control });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const lines = useWatch({ control, name: "items" });
  const lensSource = useWatch({ control, name: "lens_source" });
  const itemErrors = formState.errors.items;

  const pickStock = (index: number, item: InventoryItem) => {
    setValue(`items.${index}.item_id`, item.id);
    setValue(`items.${index}.description`, describe(item), { shouldValidate: formState.isSubmitted });
    setValue(`items.${index}.price`, String(item.price));
  };

  return (
    <section aria-labelledby="items-title" className="card-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="items-title" className="text-lg font-semibold">
          Frame &amp; lenses
        </h2>
        <span className="hidden text-xs text-muted-foreground sm:block">Picking from stock reduces stock automatically</span>
      </div>

      <div className="space-y-3">
        <div className="hidden grid-cols-[1fr_4.5rem_8rem_2.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
          <span>Item</span>
          <span>Qty</span>
          <span>Price</span>
          <span />
        </div>

        {fields.map((field, index) => {
          const line = lines?.[index];
          const fromStock = !!line?.item_id;
          const lineError = itemErrors?.[index];
          return (
            <div
              key={field.id}
              className="relative grid grid-cols-[1fr_4.5rem_2.5rem] gap-2 animate-in fade-in-0 slide-in-from-top-1 focus-within:z-20 sm:grid-cols-[1fr_4.5rem_8rem_2.5rem]"
            >
              <div className="col-span-3 sm:col-span-1">
                <SuggestInput<InventoryItem>
                  aria-label={`Item ${index + 1}`}
                  placeholder={PLACEHOLDERS[index] ?? "Another item — search stock or type"}
                  aria-invalid={!!lineError?.description || undefined}
                  {...register(`items.${index}.description`)}
                  fetchSuggestions={findStockItems}
                  getKey={(i) => i.id}
                  onPick={(item) => pickStock(index, item)}
                  renderSuggestion={(item) => (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{describe(item)}</p>
                        <p className="text-xs text-muted-foreground">{ITEM_CATEGORIES[item.category]}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium">{formatMoney(item.price, currency)}</p>
                        <p className={cn("text-xs", item.qty > 0 ? "text-success" : "text-destructive")}>
                          {item.qty > 0 ? `${item.qty} in stock` : "Out of stock"}
                        </p>
                      </div>
                    </div>
                  )}
                />
                {fromStock && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success/10 py-0.5 pr-1 pl-2 text-xs font-medium text-success">
                    <PackageCheckIcon className="size-3.5" /> From stock
                    <button
                      type="button"
                      aria-label="Not from stock"
                      onClick={() => setValue(`items.${index}.item_id`, "")}
                      className="grid size-4 place-items-center rounded-full hover:bg-success/20"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                )}
                {lineError?.description && <p className="mt-1 text-sm text-destructive">{lineError.description.message}</p>}
              </div>
              <Input
                aria-label={`Quantity for item ${index + 1}`}
                inputMode="numeric"
                className="text-center"
                aria-invalid={!!lineError?.qty || undefined}
                {...register(`items.${index}.qty`)}
              />
              <Input
                aria-label={`Price for item ${index + 1}`}
                inputMode="decimal"
                placeholder="0"
                className="text-right sm:order-none"
                aria-invalid={!!lineError?.price || undefined}
                {...register(`items.${index}.price`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Remove item ${index + 1}`}
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                className="text-muted-foreground"
              >
                <Trash2Icon />
              </Button>
            </div>
          );
        })}

        {itemErrors?.root?.message && <p className="text-sm text-destructive">{itemErrors.root.message}</p>}
        {itemErrors?.message && <p className="text-sm text-destructive">{itemErrors.message}</p>}

        <Button type="button" variant="ghost" onClick={() => append({ ...EMPTY_LINE })} className="text-muted-foreground">
          <PlusIcon /> Add item
        </Button>
      </div>

      <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 sm:items-end">
        <Segmented
          label="Where the lenses come from"
          value={lensSource}
          onChange={(v) => setValue("lens_source", v)}
          options={LENS_SOURCES}
        />
        {lensSource === "lab" && (
          <div className="space-y-1.5 animate-in fade-in-0 slide-in-from-left-1">
            <Label htmlFor="lab_name">Lab</Label>
            <Input id="lab_name" placeholder="Lab or company name" {...register("lab_name")} />
          </div>
        )}
      </div>
    </section>
  );
}

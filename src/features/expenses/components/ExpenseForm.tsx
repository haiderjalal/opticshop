"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Segmented } from "@/components/shared/Segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/constants/app";
import { addExpense } from "@/features/expenses/actions";
import { cn } from "@/lib/utils";

import type { ActionResult, PaymentMethod } from "@/types/domain";

const METHOD_OPTIONS = Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value: value as PaymentMethod, label }));

/** Category tap → amount → Enter. Three touches for the everyday case. */
export function ExpenseForm({ today }: { today: string }) {
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const amountRef = useRef<HTMLInputElement>(null);
  const [, action, pending] = useActionState(async (prev: ActionResult | null, form: FormData) => {
    const result = await addExpense(prev, form);
    if (result.ok) {
      toast.success(result.message);
      setCategory("");
    } else {
      toast.error(result.message);
    }
    return result;
  }, null);

  return (
    <form action={action} className="card-surface space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Add an expense</h2>

      <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
        {EXPENSE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === category}
            onClick={() => {
              setCategory(c);
              amountRef.current?.focus();
            }}
            className={cn(
              "h-8 rounded-full border px-3 text-sm font-medium transition-all active:scale-95",
              c === category ? "border-transparent bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
        <div className="space-y-1.5">
          <Label htmlFor="expense-category">Category</Label>
          <Input
            id="expense-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Pick above or type"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input ref={amountRef} id="expense-amount" name="amount" inputMode="decimal" required placeholder="0" className="text-right font-semibold" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-date">Date</Label>
          <Input id="expense-date" name="spent_on" type="date" defaultValue={today} max={today} required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="expense-note">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="expense-note" name="note" placeholder="e.g. Lab bill for order #1042" />
        </div>
        <Segmented label="Paid by" name="method" value={method} onChange={setMethod} options={METHOD_OPTIONS} className="sm:w-80" />
      </div>

      <Button type="submit" size="lg" className="w-full rounded-xl sm:w-auto" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        Add expense
      </Button>
    </form>
  );
}

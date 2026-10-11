"use client";

import { useOptimistic, useTransition } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { adjustStock } from "@/features/inventory/actions";
import { cn } from "@/lib/utils";

/** Tap +/− to count stock; the number moves instantly and the server catches up. */
export function QtyStepper({ itemId, qty, lowStock, label }: { itemId: string; qty: number; lowStock: number; label: string }) {
  const [shown, addOptimistic] = useOptimistic(qty, (current: number, delta: number) => current + delta);
  const [, start] = useTransition();

  const change = (delta: number) =>
    start(async () => {
      addOptimistic(delta);
      const result = await adjustStock(itemId, delta);
      if (!result.ok) toast.error(result.message);
    });

  const tone = shown < 0 ? "text-destructive" : shown <= lowStock ? "text-status-pending" : "text-foreground";

  return (
    <div className="inline-flex items-center rounded-xl border bg-card">
      <button
        type="button"
        aria-label={`One less ${label}`}
        onClick={() => change(-1)}
        className="grid size-9 place-items-center rounded-l-xl text-muted-foreground transition-colors hover:bg-muted active:scale-90"
      >
        <MinusIcon className="size-4" />
      </button>
      <output aria-live="polite" aria-label={`${label} in stock`} className={cn("w-10 text-center font-mono text-sm font-semibold", tone)}>
        {shown}
      </output>
      <button
        type="button"
        aria-label={`One more ${label}`}
        onClick={() => change(1)}
        className="grid size-9 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:bg-muted active:scale-90"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

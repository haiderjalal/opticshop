"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteExpense } from "@/features/expenses/actions";
import { cn } from "@/lib/utils";

/** Two taps to delete: the first arms the button, so a stray tap cannot lose a record. */
export function DeleteExpenseButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        start(async () => {
          const result = await deleteExpense(id);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        });
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors",
        armed ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-muted",
      )}
      aria-label={armed ? "Tap again to delete" : "Delete expense"}
    >
      {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
      {armed && "Delete?"}
    </button>
  );
}

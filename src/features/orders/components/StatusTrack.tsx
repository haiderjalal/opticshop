import { CheckIcon } from "lucide-react";

import { ORDER_STATUS } from "@/constants/app";
import { cn } from "@/lib/utils";

import type { LensSource, OrderStatus } from "@/types/domain";

/** Booked → (At lab) → Ready → Delivered. The lab step only exists for lab-made lenses. */
export function StatusTrack({ status, lensSource }: { status: OrderStatus; lensSource: LensSource }) {
  if (status === "cancelled") return null;

  const steps: OrderStatus[] =
    lensSource === "lab" || status === "at_lab" ? ["pending", "at_lab", "ready", "delivered"] : ["pending", "ready", "delivered"];
  const current = steps.indexOf(status);
  // The line runs from the centre of the first step to the centre of the last.
  const inset = 50 / steps.length;
  const span = 100 - 2 * inset;

  return (
    <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute top-4 h-0.5 rounded bg-border" style={{ left: `${inset}%`, right: `${inset}%` }} />
      <span
        aria-hidden
        className="grow-x absolute top-4 h-0.5 rounded coating"
        style={{ left: `${inset}%`, width: `${(span * current) / (steps.length - 1)}%` }}
      />
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="relative flex flex-col items-center gap-2 text-center" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "relative grid size-8 place-items-center rounded-full border-2 bg-card text-xs font-bold transition-colors",
                done && "border-transparent coating text-white",
                active && "border-coat-violet text-coat-violet shadow-[0_0_0_6px_color-mix(in_oklch,var(--coat-violet)_14%,transparent)]",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-xs font-medium sm:text-sm", active ? "text-foreground" : "text-muted-foreground")}>
              {ORDER_STATUS[step].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

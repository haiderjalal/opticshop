import { ORDER_STATUS } from "@/constants/app";
import { cn } from "@/lib/utils";

import type { OrderStatus } from "@/types/domain";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { label, className: tone } = ORDER_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

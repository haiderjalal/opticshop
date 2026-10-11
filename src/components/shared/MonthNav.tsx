import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/format";

/** Previous / next month as plain links, so the month lives in the URL and can be bookmarked. */
export function MonthNav({ month, currentMonth, basePath }: { month: string; currentMonth: string; basePath: string }) {
  const next = shiftMonth(month, 1);
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
      <Link href={`${basePath}?m=${shiftMonth(month, -1)}`} aria-label="Previous month" className={buttonVariants({ variant: "ghost", size: "icon" })}>
        <ChevronLeftIcon />
      </Link>
      <span className="min-w-36 text-center text-sm font-semibold">{formatMonth(month)}</span>
      {next <= currentMonth ? (
        <Link href={`${basePath}?m=${next}`} aria-label="Next month" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ChevronRightIcon />
        </Link>
      ) : (
        <span className="size-9" aria-hidden />
      )}
    </div>
  );
}

/** Reads `?m=YYYY-MM`, falling back to the current month. Future months are clamped. */
export function parseMonth(value: string | string[] | undefined, currentMonth: string): string {
  const m = Array.isArray(value) ? value[0] : value;
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= currentMonth ? m : currentMonth;
}

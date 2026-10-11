import { addDays, daysBetween, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { DailyTotal } from "@/types/domain";

interface MonthChartProps {
  days: DailyTotal[];
  start: string;
  end: string;
  today: string;
  currency: string;
  className?: string;
}

const LABELED_DAYS = new Set([1, 5, 10, 15, 20, 25]);

/** Daily sales (coated bars) against expenses (thin bars). Pure markup, animated by CSS. */
export function MonthChart({ days, start, end, today, currency, className }: MonthChartProps) {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const dates = Array.from({ length: daysBetween(start, end) + 1 }, (_, i) => addDays(start, i));
  const max = Math.max(1, ...days.map((d) => Math.max(d.sales, d.expenses)));

  return (
    <figure className={cn("w-full", className)}>
      <div className="flex h-40 items-end gap-[3px] sm:gap-1" role="img" aria-label="Daily sales and expenses this month">
        {dates.map((date, i) => {
          const d = byDay.get(date);
          const sales = d?.sales ?? 0;
          const expenses = d?.expenses ?? 0;
          const isToday = date === today;
          return (
            <div
              key={date}
              className="group relative flex h-full flex-1 items-end justify-center gap-[1px]"
              title={`${formatDate(date)} — sales ${formatMoney(sales, currency)}, expenses ${formatMoney(expenses, currency)}`}
            >
              <span
                className={cn("bar w-full max-w-4 rounded-t-[3px] coating-v", date > today && "opacity-0", !sales && "opacity-15")}
                style={{ height: `${Math.max(2, (sales / max) * 100)}%`, "--i": i } as React.CSSProperties}
              />
              {expenses > 0 && (
                <span
                  className="bar w-1 shrink-0 rounded-t-[2px] bg-destructive/60"
                  style={{ height: `${(expenses / max) * 100}%`, "--i": i } as React.CSSProperties}
                />
              )}
              {isToday && <span className="absolute -bottom-2 size-1 rounded-full bg-foreground" aria-hidden />}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-[3px] font-mono text-[10px] text-muted-foreground sm:gap-1">
        {dates.map((date) => {
          const day = Number(date.slice(8));
          return (
            <span key={date} className="flex-1 text-center">
              {LABELED_DAYS.has(day) ? day : ""}
            </span>
          );
        })}
      </div>
      <figcaption className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm coating" /> Sales
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-destructive/60" /> Expenses
        </span>
      </figcaption>
    </figure>
  );
}

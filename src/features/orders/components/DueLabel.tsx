import { daysBetween } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "Due today" / "Due in 2 days" / "3 days late", coloured by urgency. */
export function DueLabel({ date, today, className }: { date: string | null; today: string; className?: string }) {
  if (!date) return null;
  const days = daysBetween(today, date);
  const text = days === 0 ? "Due today" : days === 1 ? "Tomorrow" : days > 1 ? `In ${days} days` : `${-days} day${days === -1 ? "" : "s"} late`;
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        days < 0 ? "text-destructive" : days === 0 ? "text-status-pending" : "text-muted-foreground",
        className,
      )}
    >
      {text}
    </span>
  );
}

import type { ReactNode } from "react";

import { LensMark } from "@/components/shared/LensMark";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <LensMark className="mb-1 h-8 w-16 opacity-40 grayscale" />
      <p className="font-heading text-lg font-semibold">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

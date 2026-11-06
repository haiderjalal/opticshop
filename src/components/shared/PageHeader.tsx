import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <span aria-hidden className="accent-bar mb-3" />
        {eyebrow && <p className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-3xl font-bold sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

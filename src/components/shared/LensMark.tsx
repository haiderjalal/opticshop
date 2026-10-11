import { useId } from "react";

import { cn } from "@/lib/utils";

/** Default shop mark (two lenses and a bridge) used until a shop uploads its own logo. */
export function LensMark({ className }: { className?: string }) {
  // Unique per instance: a shared id resolves to the first copy, and if that copy is
  // hidden (e.g. the desktop sidebar on a phone) every mark loses its gradient.
  const gradient = useId();
  const stroke = `url(#${gradient})`;

  return (
    <svg viewBox="0 0 48 24" className={cn("h-6 w-12", className)} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--coat-green)" />
          <stop offset="1" stopColor="var(--coat-violet)" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="13" r="9" fill="none" stroke={stroke} strokeWidth="3" />
      <circle cx="36" cy="13" r="9" fill="none" stroke={stroke} strokeWidth="3" />
      <path d="M21 11.5c1.8-2 4.2-2 6 0" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

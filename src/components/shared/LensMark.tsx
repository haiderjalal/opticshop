import { useId, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface LensMarkProps {
  className?: string;
  /** Draws the frames on when shown. Use for hero art; static everywhere else. */
  animated?: boolean;
}

/** Default shop mark (two lenses and a bridge) used until a shop uploads its own logo. */
export function LensMark({ className, animated = false }: LensMarkProps) {
  // Unique per instance: a shared id resolves to the first copy, and if that copy is
  // hidden (e.g. the desktop sidebar on a phone) every mark loses its gradient.
  const gradient = useId();
  const stroke = `url(#${gradient})`;
  // pathLength="1" lets the CSS draw animation work in fractions of the outline.
  const drawn = animated ? { pathLength: 1, className: "lens-draw" } : {};
  const delay = (ms: number): CSSProperties | undefined =>
    animated ? ({ "--draw-delay": `${ms}ms` } as CSSProperties) : undefined;

  return (
    <svg viewBox="0 0 48 24" className={cn("h-6 w-12", className)} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--coat-green)" />
          <stop offset="1" stopColor="var(--coat-violet)" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="13" r="9" fill="none" stroke={stroke} strokeWidth="3" style={delay(0)} {...drawn} />
      <circle cx="36" cy="13" r="9" fill="none" stroke={stroke} strokeWidth="3" style={delay(160)} {...drawn} />
      <path
        d="M21 11.5c1.8-2 4.2-2 6 0"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        style={delay(380)}
        {...drawn}
      />
    </svg>
  );
}

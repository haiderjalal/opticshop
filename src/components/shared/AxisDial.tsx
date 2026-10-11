import { cn } from "@/lib/utils";

interface AxisDialProps {
  /** Cylinder axis in degrees (TABO, 0–180). */
  axis: number | null;
  className?: string;
}

const TICKS = Array.from({ length: 13 }, (_, i) => i * 15);
const CX = 24;
const CY = 24;
const R = 20;

/**
 * A miniature TABO protractor — the scale printed on every trial frame.
 * The needle swings to the typed axis so a mistyped 18 vs 180 is obvious at a glance.
 */
export function AxisDial({ axis, className }: AxisDialProps) {
  const valid = axis !== null && Number.isFinite(axis) && axis >= 0 && axis <= 180;

  return (
    <svg viewBox="0 0 48 27" className={cn("h-[27px] w-12 shrink-0 text-muted-foreground", className)} aria-hidden>
      <path d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="currentColor" strokeOpacity={0.25} />
      {TICKS.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const inner = deg % 45 === 0 ? R - 5 : R - 3;
        return (
          <line
            key={deg}
            x1={CX + inner * Math.cos(rad)}
            y1={CY - inner * Math.sin(rad)}
            x2={CX + R * Math.cos(rad)}
            y2={CY - R * Math.sin(rad)}
            stroke="currentColor"
            strokeOpacity={deg % 45 === 0 ? 0.6 : 0.3}
            strokeWidth={1}
          />
        );
      })}
      <g
        style={{
          transform: `rotate(${-(valid ? axis : 0)}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          transition: "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms",
          opacity: valid ? 1 : 0,
        }}
      >
        <line x1={CX - R + 2} y1={CY} x2={CX + R - 1} y2={CY} stroke="var(--coat-violet)" strokeWidth={1.75} strokeLinecap="round" />
        <circle cx={CX + R - 1} cy={CY} r={2} fill="var(--coat-green)" />
      </g>
      <circle cx={CX} cy={CY} r={1.75} fill="currentColor" />
    </svg>
  );
}

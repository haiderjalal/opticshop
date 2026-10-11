import { AxisDial } from "@/components/shared/AxisDial";
import { formatRx } from "@/lib/format";

import type { Rx, RxEye } from "@/types/domain";

const COLUMNS: { key: keyof RxEye; label: string }[] = [
  { key: "sph", label: "SPH" },
  { key: "cyl", label: "CYL" },
  { key: "axis", label: "AXIS" },
  { key: "add", label: "ADD" },
  { key: "prism", label: "PRISM" },
  { key: "pd", label: "PD" },
  { key: "hd", label: "HD" },
];

function cell(eye: RxEye, key: keyof RxEye): string {
  const value = eye[key];
  if (value === null || value === "") return "—";
  if (key === "sph" || key === "cyl" || key === "add") return formatRx(value as number);
  if (key === "axis") return `${value}°`;
  return String(value);
}

/** Read-only prescription, laid out like the card staff fill in. */
export function RxView({ rx }: { rx: Rx }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left font-mono text-[11px] tracking-wider text-muted-foreground">
            <th className="w-10 pb-2" />
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" className="pb-2 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {(["r", "l"] as const).map((eye) => (
            <tr key={eye} className="border-t">
              <th scope="row" className="py-2">
                <span className="grid size-8 place-items-center rounded-full border-2 border-foreground/80 font-heading text-xs font-bold">
                  {eye.toUpperCase()}
                </span>
              </th>
              {COLUMNS.map((c) => (
                <td key={c.key} className="py-2">
                  {c.key === "axis" ? (
                    <span className="flex items-center gap-1.5">
                      {cell(rx[eye], c.key)}
                      {rx[eye].axis !== null && <AxisDial axis={rx[eye].axis} className="h-5 w-9" />}
                    </span>
                  ) : (
                    cell(rx[eye], c.key)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useFormState, useWatch, type UseFormReturn } from "react-hook-form";
import { CopyIcon } from "lucide-react";

import { AxisDial } from "@/components/shared/AxisDial";
import { Segmented } from "@/components/shared/Segmented";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RX_FIELDS, type OrderFormValues, type OrderInput, type RxField } from "@/lib/validations/order.schema";

import type { RxSource } from "@/types/domain";

type OrderForm = UseFormReturn<OrderFormValues, unknown, OrderInput>;

const COLUMNS: Record<RxField, { label: string; title: string; signed?: boolean; inputMode?: "numeric" | "decimal" }> = {
  sph: { label: "SPH", title: "Sphere", signed: true },
  cyl: { label: "CYL", title: "Cylinder", signed: true },
  axis: { label: "AXIS", title: "Axis, 0–180°", inputMode: "numeric" },
  add: { label: "ADD", title: "Near addition", signed: true },
  prism: { label: "PRISM", title: "Prism and base, e.g. 2 BI" },
  pd: { label: "PD", title: "Pupillary distance (mm)", inputMode: "decimal" },
  hd: { label: "HD", title: "Height (mm)", inputMode: "decimal" },
};

const EYES = [
  { key: "r", label: "R", name: "Right eye" },
  { key: "l", label: "L", name: "Left eye" },
] as const;

const RX_SOURCES: { value: RxSource; label: string }[] = [
  { value: "own", label: "Own Rx" },
  { value: "tested", label: "Tested here" },
  { value: "none", label: "No Rx" },
];

/** `-1.5` → `-1.50`, `1.25` → `+1.25`; anything unparseable is left for validation to flag. */
function normalisePower(raw: string): string {
  const n = Number(raw.trim().replace("−", "-"));
  if (raw.trim() === "" || !Number.isFinite(n)) return raw;
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export function RxCard({ form }: { form: OrderForm }) {
  const { register, setValue, getValues, control } = form;
  const formState = useFormState({ control });
  const rxSource = useWatch({ control, name: "rx_source" });
  const axes = { r: useWatch({ control, name: "rx.r.axis" }), l: useWatch({ control, name: "rx.l.axis" }) };
  const hidden = rxSource === "none";

  const errors = EYES.flatMap(({ key, label }) =>
    RX_FIELDS.flatMap((field) => {
      const message = formState.errors.rx?.[key]?.[field]?.message;
      return message ? [`${label} ${message}`] : [];
    }),
  );

  const copyRightToLeft = () => {
    const right = getValues("rx.r");
    RX_FIELDS.forEach((field) => setValue(`rx.l.${field}`, right[field], { shouldValidate: formState.isSubmitted }));
  };

  return (
    <section aria-labelledby="rx-title" className="card-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="rx-title" className="text-lg font-semibold">
          Prescription
        </h2>
        <Segmented
          label="Where the prescription comes from"
          value={rxSource}
          onChange={(v) => setValue("rx_source", v)}
          options={RX_SOURCES}
          className="w-full sm:w-auto sm:min-w-[18rem]"
        />
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300",
          hidden ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
        )}
        inert={hidden}
      >
        <div className="overflow-hidden">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-x-1.5 border-spacing-y-1.5">
              <thead>
                <tr>
                  <th className="w-11" />
                  {RX_FIELDS.map((field) => (
                    <th
                      key={field}
                      scope="col"
                      title={COLUMNS[field].title}
                      className={cn(
                        "font-mono text-[11px] font-semibold tracking-wider text-muted-foreground",
                        field === "axis" ? "w-[7.5rem] text-left" : "text-center",
                      )}
                    >
                      {/* Centre AXIS over its input, not over input + dial. */}
                      {field === "axis" ? <span className="inline-block w-16 text-center">AXIS</span> : COLUMNS[field].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EYES.map(({ key, label, name }) => (
                  <tr key={key}>
                    <th scope="row">
                      <span
                        title={name}
                        className="grid size-9 place-items-center rounded-full border-2 border-foreground/80 font-heading text-sm font-bold"
                      >
                        {label}
                      </span>
                    </th>
                    {RX_FIELDS.map((field) => {
                      const path = `rx.${key}.${field}` as const;
                      const reg = register(path);
                      const column = COLUMNS[field];
                      const invalid = !!formState.errors.rx?.[key]?.[field];
                      const input = (
                        <Input
                          {...reg}
                          aria-label={`${name} ${column.title}`}
                          aria-invalid={invalid || undefined}
                          inputMode={column.inputMode}
                          placeholder={field === "prism" ? "—" : column.signed ? "0.00" : ""}
                          className="h-11 px-2 text-center font-mono text-[0.95rem]"
                          onBlur={(e) => {
                            reg.onBlur(e);
                            if (column.signed) setValue(path, normalisePower(e.target.value));
                          }}
                        />
                      );
                      return (
                        <td key={field}>
                          {field === "axis" ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 shrink-0">{input}</div>
                              <AxisDial axis={axes[key] === "" ? null : Number(axes[key])} />
                            </div>
                          ) : (
                            input
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errors.length > 0 && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {errors.join(" · ")}
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
            <button
              type="button"
              onClick={copyRightToLeft}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CopyIcon className="size-4" /> Copy R to L
            </button>
            <div className="space-y-1.5">
              <Label htmlFor="prescribed_by">Prescribed by</Label>
              <Input id="prescribed_by" placeholder="Doctor or clinic" {...register("prescribed_by")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checked_by">Checked by</Label>
              <Input id="checked_by" placeholder="Who tested the eyes" {...register("checked_by")} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { z } from "zod";

import { digitsOnly } from "../format.ts";
import { PAYMENT_METHOD_VALUES, isoDate, money, optionalIsoDate, text, requiredText } from "./common.ts";

// ─── Prescription ───────────────────────────────────────────────────────────

const rxNumber = (label: string, min: number, max: number, integer = false) =>
  z
    .string()
    .trim()
    .max(10)
    .refine((v) => {
      if (v === "") return true;
      const n = Number(v.replace("−", "-"));
      return Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n));
    }, `${label}: ${min} to ${max}`)
    .transform((v) => (v === "" ? null : Number(v.replace("−", "-"))));

const rxEye = z
  .object({
    sph: rxNumber("SPH", -30, 30),
    cyl: rxNumber("CYL", -12, 12),
    axis: rxNumber("Axis", 0, 180, true),
    add: rxNumber("ADD", 0, 4),
    prism: text(12).transform((v) => v || null),
    pd: rxNumber("PD", 20, 80),
    hd: rxNumber("HD", 0, 60),
  })
  .superRefine((eye, ctx) => {
    // A cylinder power is meaningless without the axis it sits on.
    if (eye.cyl && eye.axis === null) {
      ctx.addIssue({ code: "custom", path: ["axis"], message: "Axis needed with CYL" });
    }
  });

export const RX_FIELDS = ["sph", "cyl", "axis", "add", "prism", "pd", "hd"] as const;
export type RxField = (typeof RX_FIELDS)[number];

// ─── Line items ─────────────────────────────────────────────────────────────

const orderLine = z
  .object({
    item_id: z.union([z.literal(""), z.uuid()]),
    description: text(200),
    qty: z
      .string()
      .trim()
      .refine((v) => /^\d{1,3}$/.test(v) && Number(v) >= 1 && Number(v) <= 100, "1–100")
      .transform(Number),
    price: money,
  })
  .superRefine((line, ctx) => {
    if (!line.description && (line.price > 0 || line.item_id)) {
      ctx.addIssue({ code: "custom", path: ["description"], message: "Describe this item" });
    }
  });

// ─── Order ──────────────────────────────────────────────────────────────────

export const orderSchema = z
  .object({
    phone: z
      .string()
      .max(30)
      .transform(digitsOnly)
      .pipe(z.string().regex(/^\d{7,15}$/, "Enter a valid phone number")),
    name: requiredText(120, "Enter the customer's name"),
    address: text(300),
    rx_source: z.enum(["own", "tested", "none"]),
    rx: z.object({ r: rxEye, l: rxEye }),
    prescribed_by: text(80),
    checked_by: text(80),
    // Blank lines (e.g. the unused lens row on a sunglasses sale) are dropped.
    items: z
      .array(orderLine)
      .max(30)
      .transform((lines) => lines.filter((l) => l.description))
      .refine((lines) => lines.length > 0, "Add at least one item"),
    lens_source: z.enum(["stock", "lab"]),
    lab_name: text(80),
    order_date: isoDate,
    delivery_date: optionalIsoDate,
    discount: money,
    advance: money,
    method: z.enum(PAYMENT_METHOD_VALUES),
    remarks: text(500),
  })
  .superRefine((order, ctx) => {
    if (order.delivery_date && order.delivery_date < order.order_date) {
      ctx.addIssue({ code: "custom", path: ["delivery_date"], message: "Before the order date" });
    }
    if (order.items.length === 0) return;
    const subtotal = orderSubtotal(order.items);
    if (order.discount > subtotal) {
      ctx.addIssue({ code: "custom", path: ["discount"], message: "More than the subtotal" });
    } else if (order.advance > subtotal - order.discount) {
      ctx.addIssue({ code: "custom", path: ["advance"], message: "More than the total" });
    }
  });

export type OrderFormValues = z.input<typeof orderSchema>;
export type OrderInput = z.output<typeof orderSchema>;

export function orderSubtotal(lines: { qty: number; price: number }[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.qty * l.price, 0) * 100) / 100;
}

/** Shape expected by the `create_order` database function. */
export function toCreateOrderPayload(order: OrderInput): Record<string, unknown> {
  return {
    ...order,
    rx: order.rx_source === "none" ? null : order.rx,
    lab_name: order.lens_source === "lab" ? order.lab_name : "",
    delivery_date: order.delivery_date || null,
  };
}

// ─── Other order mutations ──────────────────────────────────────────────────

export const paymentSchema = z.object({
  order_id: z.uuid(),
  amount: money.refine((v) => v > 0, "Enter an amount above 0"),
  method: z.enum(PAYMENT_METHOD_VALUES),
});

export const statusSchema = z.object({
  order_id: z.uuid(),
  status: z.enum(["pending", "at_lab", "ready", "delivered", "cancelled"]),
});

import { z } from "zod";

import { PAYMENT_METHOD_VALUES, isoDate, money, positiveMoney, requiredText, text } from "./common.ts";

export const itemSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  category: z.enum(["frame", "sunglasses", "lens", "contact_lens", "accessory"]),
  brand: text(60),
  name: requiredText(120, "Enter a model or lens type"),
  details: text(200),
  cost: money,
  price: money,
  qty: z
    .string()
    .trim()
    .refine((v) => /^-?\d{1,6}$/.test(v), "Whole number")
    .transform(Number),
  low_stock: z
    .string()
    .trim()
    .refine((v) => /^\d{1,4}$/.test(v), "Whole number")
    .transform(Number),
});

export const expenseSchema = z.object({
  spent_on: isoDate,
  category: requiredText(40, "Pick or type a category"),
  note: text(200),
  amount: positiveMoney,
  method: z.enum(PAYMENT_METHOD_VALUES),
});

const timeZones = new Set(Intl.supportedValuesOf("timeZone"));

export const settingsSchema = z.object({
  shop_name: requiredText(80, "Enter the shop name"),
  tagline: text(120),
  phone: text(40),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  address: text(300),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
  currency: requiredText(6, "Enter a currency symbol"),
  country_code: z.string().regex(/^\d{1,4}$/, "Digits only, e.g. 92"),
  timezone: z.string().refine((tz) => timeZones.has(tz), "Unknown timezone"),
  delivery_days: z
    .string()
    .refine((v) => /^\d{1,2}$/.test(v) && Number(v) <= 60, "0–60 days")
    .transform(Number),
  invoice_note: text(500),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72),
});

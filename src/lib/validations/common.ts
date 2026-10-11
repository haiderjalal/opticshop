import { z } from "zod";

import { cleanText } from "../format.ts";

export const PAYMENT_METHOD_VALUES = ["cash", "card", "bank", "wallet"] as const;

export const text = (max: number) => z.string().max(max * 2).transform(cleanText).pipe(z.string().max(max));

export const requiredText = (max: number, message: string) =>
  z.string().max(max * 2).transform(cleanText).pipe(z.string().min(1, message).max(max));

/** Form money input: "" → 0, otherwise a non-negative amount with up to 2 decimals. */
export const money = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,9}(\.\d{1,2})?$/.test(v), "Enter an amount like 2500")
  .transform((v) => (v === "" ? 0 : Number(v)));

export const positiveMoney = money.refine((v) => v > 0, "Enter an amount above 0");

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const optionalIsoDate = z.union([z.literal(""), isoDate]);

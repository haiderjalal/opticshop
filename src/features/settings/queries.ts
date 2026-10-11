import { cache } from "react";
import { headers } from "next/headers";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { ShopSettings } from "@/types/domain";

const COLUMNS =
  "shop_name, tagline, phone, email, address, logo_url, brand_color, currency, country_code, timezone, delivery_days, invoice_note";

export const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: "My Optics",
  tagline: null,
  phone: null,
  email: null,
  address: null,
  logo_url: null,
  brand_color: "#0f1b2d",
  currency: "Rs",
  country_code: "92",
  timezone: "Asia/Karachi",
  delivery_days: 3,
  invoice_note: null,
};

/** Read once per request; every page needs the shop's name, currency and timezone. */
export const getSettings = cache(async (): Promise<ShopSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select(COLUMNS).maybeSingle();
  if (error) logger.error("Failed to load settings", { code: error.code });
  return (data as ShopSettings | null) ?? DEFAULT_SETTINGS;
});

/** Absolute origin of this deployment, used in WhatsApp invoice links. */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

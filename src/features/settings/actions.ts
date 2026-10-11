"use server";

import { revalidatePath } from "next/cache";

import { fromDbError, fromZodError } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validations/shop.schema";

import type { ActionResult } from "@/types/domain";

const FIELDS = [
  "shop_name",
  "tagline",
  "phone",
  "email",
  "address",
  "brand_color",
  "currency",
  "country_code",
  "timezone",
  "delivery_days",
  "invoice_note",
] as const;
const MAX_LOGO_BYTES = 1024 * 1024;

/** Trust the file's first bytes, not its name or the browser-sent type. */
async function detectImageType(file: File): Promise<"png" | "jpeg" | null> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return "png";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  return null;
}

export async function updateSettings(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? "")])));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const values = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]));
  const update: Record<string, unknown> = values;

  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) return { ok: false, message: "The logo must be under 1 MB." };
    const type = await detectImageType(logo);
    if (!type) return { ok: false, message: "The logo must be a PNG or JPG image." };

    // A new file name each time so browsers and invoices never show a cached old logo.
    const path = `logo-${Date.now()}.${type === "png" ? "png" : "jpg"}`;
    const { error: uploadError } = await supabase.storage.from("branding").upload(path, logo, { contentType: `image/${type}` });
    if (uploadError) {
      logger.error("Logo upload failed", { detail: uploadError.message });
      return { ok: false, message: "Unable to upload the logo. Please try again." };
    }
    update.logo_url = supabase.storage.from("branding").getPublicUrl(path).data.publicUrl;
  } else if (form.get("remove_logo") === "on") {
    update.logo_url = null;
  }

  const { error } = await supabase.from("settings").update(update).eq("id", true);
  if (error) return fromDbError(error, "Unable to save settings.");

  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

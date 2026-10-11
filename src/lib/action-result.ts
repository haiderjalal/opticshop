import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";

import { logger } from "@/lib/logger";

import type { ActionResult } from "@/types/domain";

/**
 * Messages raised by our own database functions (`raise exception`, code P0001)
 * are written for shop staff and safe to show. Everything else stays in the logs.
 */
export function fromDbError(error: PostgrestError, fallback: string): ActionResult<never> {
  if (error.code === "P0001") return { ok: false, message: error.message };
  if (error.code === "42501") return { ok: false, message: "Your account does not have access to do that." };
  logger.error(fallback, { code: error.code, detail: error.message });
  return { ok: false, message: fallback };
}

export function fromZodError(error: ZodError): ActionResult<never> {
  const first = error.issues[0];
  return { ok: false, message: first ? first.message : "Check the form and try again." };
}

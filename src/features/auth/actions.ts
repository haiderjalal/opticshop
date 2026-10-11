"use server";

import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/shop.schema";

import type { ActionResult } from "@/types/domain";

export async function signIn(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const mode = form.get("mode") === "signup" ? "signup" : "signin";

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp(parsed.data);
    if (error) {
      logger.warn("Sign-up failed", { code: error.code });
      return { ok: false, message: error.message };
    }
    // With email confirmation on, Supabase returns no session until the link is clicked.
    if (!data.session) {
      return { ok: true, message: "Account created. Open the confirmation email, then sign in." };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      logger.warn("Sign-in failed", { code: error.code });
      return { ok: false, message: "Email or password is incorrect." };
    }
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { LensMark } from "@/components/shared/LensMark";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { getSettings } from "@/features/settings/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  // claim_owner() makes the very first account the owner, and reports whether the caller is staff.
  const [{ data: isStaff }, settings] = await Promise.all([supabase.rpc("claim_owner"), getSettings()]);

  if (!isStaff) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <div className="card-surface max-w-sm p-8 text-center">
          <LensMark animated className="mx-auto mb-4 h-10 w-20" />
          <h1 className="text-2xl font-bold">Waiting for access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is created, but the shop owner has not given it access yet. Ask them to add you, then sign in
            again.
          </p>
          <form action={signOut} className="mt-6">
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return <AppShell settings={settings}>{children}</AppShell>;
}

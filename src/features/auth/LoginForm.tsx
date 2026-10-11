"use client";

import { useActionState, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState(signIn, null);
  const signup = mode === "signup";

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">{signup ? "Create the shop account" : "Sign in"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {signup
            ? "The first account becomes the owner. Staff accounts need the owner's approval."
            : "Use the email and password for this shop."}
        </p>
      </div>

      <input type="hidden" name="mode" value={mode} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete={signup ? "new-password" : "current-password"}
          required
        />
      </div>

      {state && (
        <p
          role="status"
          className={cn("rounded-lg px-3 py-2 text-sm", state.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {signup ? "Create account" : "Sign in"}
      </Button>

      <button
        type="button"
        onClick={() => setMode(signup ? "signin" : "signup")}
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {signup ? "Already have an account? Sign in" : "First time here? Create the owner account"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, Loader2Icon, MailIcon } from "lucide-react";

import { Segmented } from "@/components/shared/Segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const MODES: { value: Mode; label: string }[] = [
  { value: "signin", label: "Sign in" },
  { value: "signup", label: "Create owner" },
];

const FIELD_ICON = "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(signIn, null);
  const signup = mode === "signup";

  return (
    <form action={action} className="space-y-5">
      <Segmented value={mode} onChange={setMode} options={MODES} label="Account" name="mode" />

      {/* Keyed so the heading eases in again each time the mode changes. */}
      <div key={mode} className="page-enter">
        <h2 className="text-2xl font-bold">{signup ? "Create the shop account" : "Sign in"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {signup
            ? "The first account becomes the owner. Staff accounts need the owner's approval."
            : "Use the email and password for this shop."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <MailIcon aria-hidden className={FIELD_ICON} />
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus className="pl-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <LockIcon aria-hidden className={FIELD_ICON} />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
            required
            className="pr-10 pl-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>

      {state && (
        <p
          role="status"
          className={cn(
            "page-enter rounded-lg px-3 py-2 text-sm",
            state.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {signup ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}

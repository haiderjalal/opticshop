"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { LensMark } from "@/components/shared/LensMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/features/settings/actions";

import type { ActionResult, ShopSettings } from "@/types/domain";

const TIME_ZONES = Intl.supportedValuesOf("timeZone");

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [color, setColor] = useState(settings.brand_color);
  const [preview, setPreview] = useState<string | null>(null);
  const [, action, pending] = useActionState(async (prev: ActionResult | null, form: FormData) => {
    const result = await updateSettings(prev, form);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    return result;
  }, null);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-2">
      <section className="card-surface space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Shop</h2>
        <Field id="shop_name" label="Shop name">
          <Input id="shop_name" name="shop_name" defaultValue={settings.shop_name} required maxLength={80} />
        </Field>
        <Field id="tagline" label="Tagline" hint="Shown on the sign-in page and invoices.">
          <Input id="tagline" name="tagline" defaultValue={settings.tagline ?? ""} maxLength={120} placeholder="Eye care since 1998" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label="Phone">
            <Input id="phone" name="phone" type="tel" defaultValue={settings.phone ?? ""} maxLength={40} />
          </Field>
          <Field id="email" label="Email">
            <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} maxLength={120} />
          </Field>
        </div>
        <Field id="address" label="Address">
          <Textarea id="address" name="address" rows={2} defaultValue={settings.address ?? ""} maxLength={300} />
        </Field>
      </section>

      <section className="card-surface space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Look</h2>
        <div className="flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-white">
            {preview || settings.logo_url ? (
              <Image src={preview ?? settings.logo_url ?? ""} alt="Shop logo" width={80} height={80} unoptimized={!!preview} className="size-full object-contain p-1.5" />
            ) : (
              <LensMark className="h-8 w-16" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <Input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              className="pt-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            {settings.logo_url && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="remove_logo" className="size-4 accent-current" /> Remove current logo
              </label>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">PNG or JPG under 1 MB. Square logos look best.</p>
        <Field id="brand_color" label="Brand colour" hint="Used for buttons and invoice headers. Pick a dark shade so white text stays readable.">
          <div className="flex items-center gap-3">
            <input
              id="brand_color"
              name="brand_color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border bg-card p-1"
            />
            <span className="rounded-lg px-3 py-2 font-mono text-sm text-white" style={{ background: color }}>
              {color}
            </span>
          </div>
        </Field>
      </section>

      <section className="card-surface space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Money &amp; time</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="currency" label="Currency symbol">
            <Input id="currency" name="currency" defaultValue={settings.currency} required maxLength={6} />
          </Field>
          <Field id="country_code" label="Country calling code" hint="For WhatsApp links, e.g. 92.">
            <Input id="country_code" name="country_code" inputMode="numeric" defaultValue={settings.country_code} required pattern="\d{1,4}" />
          </Field>
          <Field id="timezone" label="Timezone">
            <Input id="timezone" name="timezone" list="timezones" defaultValue={settings.timezone} required />
            <datalist id="timezones">
              {TIME_ZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </Field>
          <Field id="delivery_days" label="Usual delivery time (days)">
            <Input id="delivery_days" name="delivery_days" inputMode="numeric" defaultValue={String(settings.delivery_days)} required />
          </Field>
        </div>
      </section>

      <section className="card-surface space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Invoice</h2>
        <Field id="invoice_note" label="Note printed at the bottom" hint="Warranty, return policy, bank details…">
          <Textarea
            id="invoice_note"
            name="invoice_note"
            rows={4}
            defaultValue={settings.invoice_note ?? ""}
            maxLength={500}
            placeholder="Frames carry a 6-month warranty. Please bring this invoice when collecting."
          />
        </Field>
        <Button type="submit" size="lg" className="w-full rounded-xl" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          Save settings
        </Button>
      </section>
    </form>
  );
}

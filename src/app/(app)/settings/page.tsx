import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsForm } from "@/features/settings/components/SettingsForm";
import { getSettings } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Your shop's name, logo and invoice details. Changes apply everywhere at once." />
      <SettingsForm settings={settings} />
    </>
  );
}

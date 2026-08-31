import type { Metadata } from "next";

import { SecurityForm } from "@/modules/settings/components/security-form";
import { fetchSettings } from "@/modules/settings/services/settings.server";

export const metadata: Metadata = {
  title: "Security",
};

/** `/admin/settings/security` — one section of the shop's configuration. */
export default async function SecurityFormPage() {
  const settings = await fetchSettings();
  return <SecurityForm defaults={settings.security} />;
}

import type { Metadata } from "next";

import { ReceiptsForm } from "@/modules/settings/components/receipts-form";
import { fetchSettings } from "@/modules/settings/services/settings.server";

export const metadata: Metadata = {
  title: "Receipts",
};

/** `/admin/settings/receipts` — one section of the shop's configuration. */
export default async function ReceiptsFormPage() {
  const settings = await fetchSettings();
  return <ReceiptsForm defaults={settings.receipts} />;
}

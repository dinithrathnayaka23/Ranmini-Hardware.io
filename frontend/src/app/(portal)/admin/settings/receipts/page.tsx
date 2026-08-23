import type { Metadata } from "next";

import { ReceiptsForm } from "@/modules/settings/components/receipts-form";
import { receiptsDefaults } from "@/modules/settings/constants/settings-data";

export const metadata: Metadata = {
  title: "Receipts",
};

/** `/admin/settings/receipts` — printed receipt and invoice layout. */
export default function ReceiptsSettingsPage() {
  return <ReceiptsForm defaults={receiptsDefaults} />;
}

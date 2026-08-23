import type { Metadata } from "next";

import { BusinessLogicForm } from "@/modules/settings/components/business-logic-form";
import { businessLogicDefaults } from "@/modules/settings/constants/settings-data";

export const metadata: Metadata = {
  title: "Business Logic",
};

/** `/admin/settings/business-logic` — tax, thresholds and operational defaults. */
export default function BusinessLogicSettingsPage() {
  return <BusinessLogicForm defaults={businessLogicDefaults} />;
}

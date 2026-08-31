import type { Metadata } from "next";

import { BusinessLogicForm } from "@/modules/settings/components/business-logic-form";
import { fetchSettings } from "@/modules/settings/services/settings.server";

export const metadata: Metadata = {
  title: "Business Logic",
};

/** `/admin/settings/business-logic` — one section of the shop's configuration. */
export default async function BusinessLogicFormPage() {
  const settings = await fetchSettings();
  return <BusinessLogicForm defaults={settings.businessLogic} />;
}

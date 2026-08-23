import type { Metadata } from "next";

import { SecurityForm } from "@/modules/settings/components/security-form";
import { securityDefaults } from "@/modules/settings/constants/settings-data";

export const metadata: Metadata = {
  title: "Security",
};

/** `/admin/settings/security` — session handling and sign-in protection. */
export default function SecuritySettingsPage() {
  return <SecurityForm defaults={securityDefaults} />;
}

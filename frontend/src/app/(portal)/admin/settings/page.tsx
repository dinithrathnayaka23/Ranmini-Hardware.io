import type { Metadata } from "next";

import { ShopProfileForm } from "@/modules/settings/components/shop-profile-form";
import { fetchSettings } from "@/modules/settings/services/settings.server";

export const metadata: Metadata = {
  title: "Shop Profile",
};

/**
 * `/admin/settings` — the default settings section.
 *
 * Shop Profile is the landing section rather than a separate
 * `/admin/settings/shop-profile` route, so there is exactly one URL for it.
 */
export default async function ShopProfileSettingsPage() {
  const settings = await fetchSettings();
  return <ShopProfileForm defaults={settings.profile} />;
}

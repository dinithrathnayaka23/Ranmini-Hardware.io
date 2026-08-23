import {
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  type LucideIcon,
} from "lucide-react";

import { routes } from "@/shared/config/app.config";

/**
 * The settings sections, in the order they appear in the side navigation.
 *
 * Each is a real route rather than client-side tab state, so a section can be
 * linked to, bookmarked and reached with the browser's back button — and so a
 * future "you have unsaved changes" guard has a navigation event to hook into.
 */
export interface SettingsSection {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown under the panel heading. */
  description: string;
}

export const settingsSections: SettingsSection[] = [
  {
    label: "Shop Profile",
    href: routes.adminSettings,
    icon: Store,
    description: "Business identity, address and contact details.",
  },
  {
    label: "Business Logic",
    href: routes.adminSettingsBusinessLogic,
    icon: SlidersHorizontal,
    description: "Tax rates, low stock thresholds, and operational defaults.",
  },
  {
    label: "Receipts",
    href: routes.adminSettingsReceipts,
    icon: ReceiptText,
    description: "How printed receipts and invoices are laid out.",
  },
  {
    label: "Security",
    href: routes.adminSettingsSecurity,
    icon: ShieldCheck,
    description: "Session handling and sign-in protection.",
  },
];

/**
 * The id every settings form carries.
 *
 * The single "Save Changes" button lives in the page header, above whichever
 * section is showing. A plain `form` attribute lets that button submit a form
 * it is not nested inside, which is what keeps the header shared across all
 * four sections without any cross-component wiring.
 */
export const SETTINGS_FORM_ID = "settings-form";

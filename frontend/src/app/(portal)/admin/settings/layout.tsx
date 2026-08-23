import { Save } from "lucide-react";
import type { Metadata } from "next";

import { SettingsNav } from "@/modules/settings/components/settings-nav";
import { SETTINGS_FORM_ID } from "@/modules/settings/constants/settings-sections";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: {
    default: "System Settings",
    template: "%s · Settings | Ranmini Hardware",
  },
};

/**
 * Shell shared by every settings section.
 *
 * The heading, the section navigation and the single "Save Changes" button are
 * layout, so they persist across section navigations rather than re-rendering.
 *
 * The save button sits outside the form it submits, which is exactly what the
 * HTML `form` attribute is for: it targets the form by id, so the header stays
 * shared across all four sections with no cross-component state.
 */
export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="System Settings"
        description="Configure core application behavior, business logic, and security protocols."
        actions={
          <Button type="submit" form={SETTINGS_FORM_ID} size="sm">
            <Save aria-hidden className="size-4" />
            Save Changes
          </Button>
        }
      />

      {/* The rail sits beside the panel from `lg`; below that it becomes a
          horizontally scrollable strip above it, which keeps all four sections
          reachable on a phone without stacking four full-width rows. */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

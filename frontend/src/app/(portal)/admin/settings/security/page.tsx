import type { Metadata } from "next";

import { AuditLog } from "@/modules/audit/components/audit-log";
import { fetchAuditLog } from "@/modules/audit/services/audit.server";
import { SecurityForm } from "@/modules/settings/components/security-form";
import { fetchSettings } from "@/modules/settings/services/settings.server";

export const metadata: Metadata = {
  title: "Security",
};

/**
 * `/admin/settings/security` — one section of the shop's configuration, plus
 * the log its audit switch controls.
 *
 * <p>The log lives here rather than in the navigation rail because this is
 * where the switch is. Putting the control on one screen and its contents on
 * another is how a setting gets turned on and never looked at again.
 *
 * <p>The page number is read from the URL like every other listing in the
 * portal, so a particular page of the log can be linked to.
 */
export default async function SecurityFormPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requested = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  // Independent reads, so they run together rather than adding a round trip.
  const [settings, log] = await Promise.all([fetchSettings(), fetchAuditLog(page)]);

  return (
    <div className="space-y-5">
      <SecurityForm defaults={settings.security} />
      <AuditLog log={log} isEnabled={settings.security.auditLogEnabled} />
    </div>
  );
}

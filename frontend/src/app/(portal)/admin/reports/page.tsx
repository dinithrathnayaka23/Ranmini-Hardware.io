import type { Metadata } from "next";

import { ReportsView } from "@/modules/reports/components/reports-view";
import { PageHeader } from "@/shared/components/layout/page-header";

export const metadata: Metadata = {
  title: "Reports & Analytics",
};

/**
 * `/admin/reports` — sales performance, category mix and daily figures.
 *
 * The page itself is a Server Component; only the interactive body below the
 * heading runs on the client, because it owns the selected reporting period.
 */
export default function AdminReportsPage() {
  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <div className="mb-5">
        <PageHeader title="Reports & Analytics" />
      </div>

      <ReportsView />
    </div>
  );
}

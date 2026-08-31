import type { Metadata } from "next";

import { ReportsView } from "@/modules/reports/components/reports-view";
import { fetchReports } from "@/modules/reports/services/reports.server";
import { PageHeader } from "@/shared/components/layout/page-header";

export const metadata: Metadata = {
  title: "Reports & Analytics",
};

/**
 * `/admin/reports` — sales performance, category mix and daily figures.
 *
 * The reporting window comes from the URL, so the page can stay a Server
 * Component and fetch exactly the range being asked for. That also makes a
 * window shareable and survive a refresh, which component state would not.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  // No range means the current month, which the backend defaults to.
  const data = await fetchReports(from, to);

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <div className="mb-5">
        <PageHeader title="Reports & Analytics" />
      </div>

      <ReportsView data={data} />
    </div>
  );
}

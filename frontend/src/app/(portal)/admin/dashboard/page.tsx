import type { Metadata } from "next";

import { LowStockAlerts } from "@/modules/dashboard/components/low-stock-alerts";
import { fetchDashboard } from "@/modules/dashboard/services/dashboard.server";
import { StaffQuickAddForm } from "@/modules/staff/components/staff-quick-add-form";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatCardGrid } from "@/shared/components/ui/stat-card";
import { appConfig } from "@/shared/config/app.config";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * `/admin/dashboard` — the portal's landing screen.
 *
 * <p>A Server Component that fetches the figures and hands them to the widgets.
 * Access is already settled by the portal layout, which requires an
 * administrator before any of this renders.
 *
 * <p>The recent-activity panel is gone for now. It was placeholder prose — "an
 * invoice was generated 10 minutes ago" — and the backend has no activity feed
 * to replace it with. Showing an invented one beside real figures would make
 * every number on the page harder to trust.
 */
export default async function AdminDashboardPage() {
  const { stats, lowStock } = await fetchDashboard();

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard Overview"
        description={`Welcome back. Here's what's happening at ${appConfig.name} today.`}
      />

      <div className="mt-6">
        <StatCardGrid stats={stats} />
      </div>

      {/*
        Two columns only from `xl`. At `lg` the rail already claims 256px, which
        leaves too little for a table and a form side by side, so they stack.
      */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <LowStockAlerts items={lowStock} />
        </div>

        <div className="min-w-0">
          <StaffQuickAddForm />
        </div>
      </div>
    </div>
  );
}

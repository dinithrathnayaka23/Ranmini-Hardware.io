import type { Metadata } from "next";

import { LowStockAlerts } from "@/modules/dashboard/components/low-stock-alerts";
import { RecentActivity } from "@/modules/dashboard/components/recent-activity";
import {
  dashboardStats,
  lowStockItems,
  recentActivity,
} from "@/modules/dashboard/constants/dashboard-data";
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
 * A Server Component: it only assembles widgets and hands them their rows, so
 * swapping the placeholder constants for `await` calls against the Spring Boot
 * reporting endpoints will not change a single child component.
 */
export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard Overview"
        description={`Welcome back. Here's what's happening at ${appConfig.name} today.`}
      />

      <div className="mt-6">
        <StatCardGrid stats={dashboardStats} />
      </div>

      {/*
        Two columns only from `xl`. At `lg` the rail already claims 256px, which
        leaves too little for a table and a form side by side, so they stack.
      */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <LowStockAlerts items={lowStockItems} />
          <RecentActivity entries={recentActivity} />
        </div>

        <div className="min-w-0">
          <StaffQuickAddForm />
        </div>
      </div>
    </div>
  );
}

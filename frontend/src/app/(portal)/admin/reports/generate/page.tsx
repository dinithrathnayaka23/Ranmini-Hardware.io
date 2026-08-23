import { FileChartColumn } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/shared/components/layout/section-placeholder";

export const metadata: Metadata = {
  title: "Generate Report",
};

/** `/admin/reports/generate` — placeholder until the report builder is designed. */
export default function GenerateReportPage() {
  return (
    <SectionPlaceholder
      title="Generate Report"
      description="Build a custom report by period, category and branch."
      icon={FileChartColumn}
    />
  );
}

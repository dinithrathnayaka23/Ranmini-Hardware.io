import { CalendarRange } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/shared/components/layout/section-placeholder";

export const metadata: Metadata = {
  title: "Daily Details",
};

/** `/admin/reports/daily` — placeholder until the full daily breakdown is designed. */
export default function DailyDetailsPage() {
  return (
    <SectionPlaceholder
      title="Daily Details"
      description="Every transaction behind each day's revenue and profit."
      icon={CalendarRange}
    />
  );
}

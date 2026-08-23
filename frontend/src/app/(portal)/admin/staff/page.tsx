import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StaffPasswordForm } from "@/modules/staff/components/staff-password-form";
import { StaffProfileCard } from "@/modules/staff/components/staff-profile-card";
import { StaffProfileForm } from "@/modules/staff/components/staff-profile-form";
import { staffMembers } from "@/modules/staff/constants/staff-data";
import { PageHeader } from "@/shared/components/layout/page-header";

export const metadata: Metadata = {
  title: "Staff",
};

/**
 * `/admin/staff` — the staff record and the controls to change it.
 *
 * The shop runs with a single cashier, so this manages one person rather than
 * a directory: no list, no search, no pagination. If a second employee is ever
 * added, this page grows a list and each row links to a `/admin/staff/{id}`
 * detail screen built from these same components.
 *
 * A Server Component: it reads the record and hands it to the two forms, which
 * are the only parts that need to run on the client.
 */
export default function AdminStaffPage() {
  const staff = staffMembers[0];

  // Defensive rather than theoretical: once this reads from the API, an empty
  // response is a real possibility and a blank page would be worse than a 404.
  if (!staff) notFound();

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Staff"
        description="View and update the details of the staff member who uses the point of sale."
      />

      {/*
        Summary beside the editor from `xl`, stacked below it. The summary comes
        first in the DOM so it is also what reads first on a phone — the current
        record before the controls that change it.
      */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <StaffProfileCard staff={staff} />
        </div>

        <div className="min-w-0 space-y-5">
          <StaffProfileForm staff={staff} />
          <StaffPasswordForm staff={staff} />
        </div>
      </div>
    </div>
  );
}

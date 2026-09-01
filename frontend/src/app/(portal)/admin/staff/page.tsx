import type { Metadata } from "next";

import { StaffQuickAddForm } from "@/modules/staff/components/staff-quick-add-form";
import { StaffRowActions } from "@/modules/staff/components/staff-row-actions";
import { staffRoleDescription } from "@/modules/staff/constants/staff-roles";
import { fetchStaff } from "@/modules/staff/services/staff.server";
import { staffStatusPresentation } from "@/modules/staff/types/staff.types";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardBody } from "@/shared/components/ui/card";
import { avatarUrlFor } from "@/shared/lib/avatar-url";

export const metadata: Metadata = {
  title: "Staff",
};

/**
 * `/admin/staff` — everyone who can sign in, and the controls to manage them.
 *
 * <p>A list rather than a single record. The shop has two owners with identical
 * access plus however many cashiers they take on, so the screen has to show
 * more than one person from the start.
 *
 * <p>Adding someone is the same form as on the dashboard, deliberately: that is
 * where an owner is when they decide to give a new cashier a login, and having
 * two different onboarding forms would mean two places to keep correct.
 */
export default async function AdminStaffPage() {
  const staff = await fetchStaff();

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Staff"
        description="Everyone who can sign in. Create a cashier here, then give them their username and password directly."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {staff.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-muted">
                  No staff accounts yet. Add one with the form beside this.
                </p>
              </CardBody>
            </Card>
          ) : (
            staff.map((member) => {
              const status = staffStatusPresentation[member.status];

              return (
                <Card key={member.id}>
                  <CardBody className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar
                        fullName={member.fullName}
                        imageUrl={avatarUrlFor(member.id, member.avatarVersion)}
                        size={44}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-ink">
                            {member.fullName}
                          </p>
                          <Badge label={status.label} accent={status.accent} />
                        </div>

                        <p className="mt-0.5 text-xs text-muted">
                          {member.username} &middot; {staffRoleDescription[member.role]}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Joined {member.joinedLabel} &middot; {member.lastActive}
                        </p>
                      </div>
                    </div>

                    <StaffRowActions staff={member} />
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        <div className="min-w-0">
          <StaffQuickAddForm />
        </div>
      </div>
    </div>
  );
}

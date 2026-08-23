import { AtSign, CalendarDays, Clock, Phone, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardBody } from "@/shared/components/ui/card";
import { initialsOf } from "@/shared/lib/initials";

import { staffRoles } from "../constants/staff-roles";
import { staffStatusPresentation, type StaffMember } from "../types/staff.types";

/**
 * Read-only summary of a staff member.
 *
 * Sits beside the edit form rather than replacing it, so the current values
 * stay visible while they are being changed — useful when correcting a typo in
 * a phone number against what is on record.
 */
export function StaffProfileCard({ staff }: { staff: StaffMember }) {
  const status = staffStatusPresentation[staff.status];
  const roleLabel =
    staffRoles.find((role) => role.value === staff.role)?.label ?? staff.role;

  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700"
          >
            {initialsOf(staff.fullName)}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold tracking-tight text-ink">
              {staff.fullName}
            </h2>
            <p className="mt-0.5 text-sm text-muted">{roleLabel}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge label={status.label} accent={status.accent} />
              <span className="text-xs text-muted">
                Employee ID {staff.id}
              </span>
            </div>
          </div>
        </div>

        <dl className="mt-6 space-y-4 border-t border-line pt-5">
          <DetailRow icon={UserRound} label="Username" value={staff.username} />
          <DetailRow icon={AtSign} label="Email" value={staff.email} />
          <DetailRow icon={Phone} label="Contact" value={staff.phone} />
          <DetailRow
            icon={CalendarDays}
            label="Joined"
            value={staff.joinedLabel}
          />
          <DetailRow icon={Clock} label="Activity" value={staff.lastActive} />
        </dl>
      </CardBody>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas-subtle text-muted"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        {/* `break-words` because an email or a long name has no spaces to wrap
            on and would otherwise push the card wider than its column. */}
        <dd className="mt-0.5 text-sm break-words text-ink">{value}</dd>
      </div>
    </div>
  );
}

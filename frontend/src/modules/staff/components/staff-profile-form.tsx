"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPen } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";

import { staffRoles } from "../constants/staff-roles";
import {
  staffProfileSchema,
  type StaffProfileValues,
} from "../schemas/staff-profile.schema";
import type { StaffMember } from "../types/staff.types";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

/**
 * Edits a staff member's profile.
 *
 * NOT YET PERSISTED. Validation is complete and real, but there is no backend
 * endpoint to submit to, so a valid submission says so plainly rather than
 * pretending the record was saved. When `PATCH /api/v1/staff/{id}` exists, add
 * a BFF route handler mirroring `/api/auth/login` and call it from `onSubmit`.
 */
export function StaffProfileForm({ staff }: { staff: StaffMember }) {
  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  const defaults: StaffProfileValues = {
    fullName: staff.fullName,
    username: staff.username,
    email: staff.email,
    phone: staff.phone,
    role: staff.role,
    status: staff.status,
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StaffProfileValues>({
    resolver: zodResolver(staffProfileSchema),
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: StaffProfileValues) => {
    setNotice({
      tone: "info",
      message: `Changes for ${values.fullName} are valid. Staff records cannot be saved until the backend staff endpoint is available.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <UserPen aria-hidden className="size-[18px] text-brand-600" />
          Profile Details
        </CardTitle>
      </CardHeader>

      <CardBody>
        <p className="text-sm leading-relaxed text-muted">
          Update the cashier&apos;s contact details, role and access status.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-5 space-y-4"
        >
          {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

          {/* Two columns from `sm`: these are short fields, and pairing them
              keeps the form from becoming a long scroll of single inputs. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full Name"
              autoComplete="off"
              error={errors.fullName?.message}
              {...register("fullName")}
            />

            <TextField
              label="Username"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              error={errors.username?.message}
              {...register("username")}
            />

            <TextField
              label="Email"
              type="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              error={errors.email?.message}
              {...register("email")}
            />

            <TextField
              label="Contact Number"
              type="tel"
              autoComplete="off"
              error={errors.phone?.message}
              {...register("phone")}
            />

            <SelectField
              label="Role"
              options={staffRoles}
              error={errors.role?.message}
              {...register("role")}
            />

            <SelectField
              label="Status"
              options={STATUS_OPTIONS}
              error={errors.status?.message}
              {...register("status")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit" size="md" isLoading={isSubmitting} loadingText="Saving…">
              Save Changes
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              // Nothing to undo until something has been typed, and a live
              // Discard button on an untouched form is just noise.
              disabled={!isDirty}
              onClick={() => {
                reset(defaults);
                setNotice(null);
              }}
            >
              Discard
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

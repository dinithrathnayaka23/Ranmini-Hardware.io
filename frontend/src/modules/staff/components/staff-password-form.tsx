"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
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
import { PasswordField } from "@/shared/components/ui/password-field";

import {
  staffPasswordSchema,
  type StaffPasswordValues,
} from "../schemas/staff-profile.schema";
import type { StaffMember } from "../types/staff.types";

/**
 * Resets a staff member's password.
 *
 * Separated from the profile form deliberately: changing a credential is a
 * different kind of act from correcting a phone number, and giving it its own
 * card and its own submit button means it can never happen by accident.
 *
 * NOT YET PERSISTED — see the note on the profile form. The endpoint this
 * belongs to is `PUT /api/v1/staff/{id}/password`, and it must require the
 * signed-in administrator's own credentials before it will act.
 */
export function StaffPasswordForm({ staff }: { staff: StaffMember }) {
  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffPasswordValues>({
    resolver: zodResolver(staffPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async () => {
    setNotice({
      tone: "info",
      message: `The new password for ${staff.fullName} is valid, but cannot be saved until the backend staff endpoint is available.`,
    });

    // Clear the fields either way — a plaintext password should not sit in the
    // DOM after the form has been submitted.
    reset({ newPassword: "", confirmPassword: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <KeyRound aria-hidden className="size-[18px] text-brand-600" />
          Reset Password
        </CardTitle>
      </CardHeader>

      <CardBody>
        <p className="text-sm leading-relaxed text-muted">
          Issue a new sign-in password. Give it to {staff.fullName} directly and
          ask them to change it after their next sign-in.
        </p>

        <form
          // `method="post"` matters even though JavaScript handles the submit.
          // If someone hits Enter before React has hydrated, the browser falls
          // back to a native submission — and the default method is GET, which
          // would put the password in the URL, the browser history, the server
          // log and the Referer header. POST keeps it in the body.
          method="post"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-5 space-y-4"
        >
          {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

          <PasswordField
            label="New Password"
            placeholder="••••••••"
            // `new-password` stops a password manager offering the signed-in
            // administrator's own credentials for a colleague's account.
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <PasswordField
            label="Confirm New Password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            size="md"
            variant="secondary"
            isLoading={isSubmitting}
            loadingText="Updating…"
          >
            Update Password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

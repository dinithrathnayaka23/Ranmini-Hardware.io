"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
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
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";

import { createStaffMember } from "../actions";
import { staffRoles } from "../constants/staff-roles";
import {
  staffQuickAddSchema,
  type StaffQuickAddValues,
} from "../schemas/staff-quick-add.schema";

/**
 * Dashboard widget for onboarding a staff member without leaving the overview.
 *
 * This is how a cashier gets an account: the admin fills it in, chooses a first
 * password, and hands the credentials over directly. There is no invitation
 * email, because that would mean depending on a mail server the shop does not
 * have.
 *
 * The submission goes through a Server Action rather than a fetch from here.
 * The session token lives in an httpOnly cookie the browser cannot read, so the
 * call to the API has to be made on the server.
 */
export function StaffQuickAddForm() {
  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffQuickAddValues>({
    resolver: zodResolver(staffQuickAddSchema),
    defaultValues: {
      fullName: "",
      role: "CASHIER",
      username: "",
      initialPassword: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: StaffQuickAddValues) => {
    setNotice(null);

    const result = await createStaffMember(values);

    setNotice({
      tone: result.success ? "success" : "danger",
      message: result.message,
    });

    if (result.success) {
      // Only cleared on success. A failed submission — a username already taken,
      // say — should leave what was typed on screen to be corrected, not make
      // the admin enter it all again.
      reset({ fullName: "", role: "CASHIER", username: "", initialPassword: "" });
    } else {
      // The password should not sit in the DOM after a failed attempt either.
      reset({ ...values, initialPassword: "" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <UserPlus aria-hidden className="size-[18px] text-brand-600" />
          Staff Management
        </CardTitle>
      </CardHeader>

      <CardBody>
        <p className="text-sm leading-relaxed text-muted">
          Quickly onboard new staff members or update existing credentials.
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

          <TextField
            label="Staff Name"
            placeholder="e.g. Kasun Perera"
            autoComplete="off"
            error={errors.fullName?.message}
            {...register("fullName")}
          />

          <SelectField
            label="Role"
            options={staffRoles}
            error={errors.role?.message}
            {...register("role")}
          />

          <TextField
            label="Username"
            placeholder="k.perera"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            error={errors.username?.message}
            {...register("username")}
          />

          <PasswordField
            label="Initial Password"
            placeholder="••••••••"
            // `new-password` stops a password manager offering the signed-in
            // administrator's own credentials for a colleague's account.
            autoComplete="new-password"
            error={errors.initialPassword?.message}
            {...register("initialPassword")}
          />

          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingText="Saving…"
            className="w-full"
          >
            <UserPlus aria-hidden className="size-4" />
            Add New Staff
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

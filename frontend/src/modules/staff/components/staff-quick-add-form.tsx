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

import { staffRoles } from "../constants/staff-roles";
import {
  staffQuickAddSchema,
  type StaffQuickAddValues,
} from "../schemas/staff-quick-add.schema";

/**
 * Dashboard widget for onboarding a staff member without leaving the overview.
 *
 * NOT YET PERSISTED. Validation is complete and real, but there is no backend
 * endpoint to submit to, so a valid submission reports that plainly instead of
 * pretending the record was saved. When `POST /api/v1/staff` exists, add a BFF
 * route handler mirroring `/api/auth/login` and call it from `onSubmit`.
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
    setNotice({
      tone: "info",
      message: `Details for ${values.fullName} are valid. Staff records cannot be saved until the backend staff endpoint is available.`,
    });

    // Clear the credential fields either way — an initial password should not
    // sit in the DOM after the form has been submitted.
    reset({ ...values, username: "", initialPassword: "" });
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

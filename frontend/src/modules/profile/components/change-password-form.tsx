"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { PasswordField } from "@/shared/components/ui/password-field";
import { PasswordStrength } from "@/shared/components/ui/password-strength";

import { changeMyPassword } from "../actions";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "../schemas/profile.schema";

/**
 * Changing your own password.
 *
 * <p>The current password is required, unlike an administrator resetting
 * somebody else's. An admin doing that has established who the person is by
 * standing in front of them; a form on an unlocked screen has established
 * nothing, and without this anyone passing a desk could lock the owner out of
 * their own shop.
 */
export function ChangePasswordForm() {
  const [notice, setNotice] = React.useState<{ tone: AlertTone; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    setNotice(null);
    const result = await changeMyPassword(values);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    // Cleared either way. Passwords should not sit in the DOM after a
    // submission, and on a failure the person is retyping anyway.
    reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

          <PasswordField
            label="Current Password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />

          <PasswordField
            label="New Password"
            placeholder="••••••••"
            // `new-password` stops a password manager filling the current one
            // here, and prompts it to offer a generated password instead.
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />


          <PasswordStrength password={watch("newPassword") ?? ""} />

          <PasswordField
            label="Repeat New Password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <p className="text-xs leading-relaxed text-muted">
            You stay signed in on this device after changing it. Anyone signed in
            elsewhere keeps their session until it expires.
          </p>

          <Button type="submit" isLoading={isSubmitting} loadingText="Changing…">
            <KeyRound aria-hidden className="size-4" />
            Change Password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send, User } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";

import { requestPasswordHelp } from "../actions";
import type { PortalId } from "../constants/portals";
import {
  passwordHelpSchema,
  type PasswordHelpValues,
} from "../schemas/password-reset.schema";

import { BackToSignIn } from "./forgot-password-form";

/**
 * Asks the shop owner to reset a password, by username.
 *
 * <p>The recovery route for an account with no email address, which describes
 * most cashiers. The request lands in the owner's notification bell; the owner
 * sets a temporary password and tells the person, and the person chooses their
 * own the moment they sign in with it.
 *
 * <p>Like the email form, the confirmation replaces the form and is worded as a
 * conditional, because the server answers identically for a username that does
 * not exist. Saying "the owner has been told" as a fact would reveal which
 * usernames are real.
 */
export function PasswordHelpForm({ portal }: { portal: PortalId }) {
  const [confirmation, setConfirmation] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordHelpValues>({
    resolver: zodResolver(passwordHelpSchema),
    defaultValues: { username: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: PasswordHelpValues) => {
    setFormError(null);

    const result = await requestPasswordHelp(values);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setConfirmation(result.message);
  };

  if (confirmation) {
    return (
      <div className="space-y-6">
        <Alert tone="success" message={confirmation} />

        <p className="text-sm leading-relaxed text-muted">
          When the owner gives you the temporary password, sign in with it as
          usual. You will be asked to choose a new password straight away.
        </p>

        <BackToSignIn portal={portal} />
      </div>
    );
  }

  return (
    <form
      // Before hydration a native submit defaults to GET, which would put the
      // username in the URL and the server log.
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 sm:space-y-6"
    >
      {formError ? <Alert message={formError} /> : null}

      <TextField
        label="Username"
        icon={User}
        placeholder="The name you sign in with"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        error={errors.username?.message}
        {...register("username")}
      />

      <Button type="submit" isLoading={isSubmitting} loadingText="Sending…" className="w-full">
        <Send aria-hidden className="size-4" />
        Send Request
      </Button>

      <BackToSignIn portal={portal} />
    </form>
  );
}

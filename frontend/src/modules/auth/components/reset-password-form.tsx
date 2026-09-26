"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, KeyRound } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { Button, ButtonLink } from "@/shared/components/ui/button";
import { PasswordField } from "@/shared/components/ui/password-field";
import { PasswordStrength } from "@/shared/components/ui/password-strength";

import { confirmPasswordReset } from "../actions";
import { portals, type PortalId } from "../constants/portals";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "../schemas/password-reset.schema";

/**
 * Chooses a new password against a reset link.
 *
 * <p>The page has already asked the backend whether the token is live, so this
 * renders only for a link that was good a moment ago. It can still fail — the
 * link may expire between the check and the submit, or have been spent in
 * another tab — and that case is handled here rather than assumed away.
 */
export function ResetPasswordForm({
  token,
  portal = "admin",
}: {
  token: string;
  /** Whose reset page this is — decides where the person is sent afterwards. */
  portal?: PortalId;
}) {
  const { loginRoute, resetPasswordRoute } = portals[portal];
  const [formError, setFormError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setFormError(null);

    const result = await confirmPasswordReset(values);

    if (!result.success) {
      setFormError(result.message);
      // Cleared on failure so the person retypes rather than resubmitting a
      // password they may have mistyped in both fields.
      reset({ token, password: "", confirmPassword: "" });
      return;
    }

    // The token in the URL is spent now, so it comes out of the address bar and
    // out of the back history — a shared counter PC should not be left showing
    // a reset link for the owner's account.
    //
    // Done with the History API rather than `router.replace`, because a Next.js
    // navigation would unmount this component and the confirmation below would
    // never be seen. This rewrites the URL and leaves the page where it is.
    window.history.replaceState(null, "", resetPasswordRoute);

    setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-6">
        <Alert
          tone="success"
          message="Your password has been changed. Sign in with your new one."
        />

        {/* The shared button, so the last step of the reset flow looks like the
            Sign In button it is about to hand the user back to. */}
        <ButtonLink href={loginRoute} className="w-full">
          Go to Sign In
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 sm:space-y-6">
      {formError ? <Alert message={formError} /> : null}

      {/*
        The token travels in the form rather than being read from the URL by
        this component. Reading it here would mean `useSearchParams`, which
        opts the whole route out of static prerendering for a value the page
        already has.
      */}
      <input type="hidden" {...register("token")} />

      <PasswordField
        label="New Password"
        placeholder="••••••••"
        // Prompts a password manager to offer a generated password, and stops
        // it filling the old one into a field meant for the new.
        autoComplete="new-password"
        autoFocus
        error={errors.password?.message}
        {...register("password")}
      />


      <PasswordStrength password={watch("password") ?? ""} />

      <PasswordField
        label="Repeat New Password"
        placeholder="••••••••"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <p className="text-xs leading-relaxed text-muted">
        Using this link signs nobody out — any session
        already open elsewhere runs until it expires.
      </p>

      <Button type="submit" isLoading={isSubmitting} loadingText="Saving…" className="w-full">
        <KeyRound aria-hidden className="size-4" />
        Set New Password
      </Button>
    </form>
  );
}

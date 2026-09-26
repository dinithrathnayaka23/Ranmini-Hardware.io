"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { PasswordField } from "@/shared/components/ui/password-field";
import { PasswordMatch } from "@/shared/components/ui/password-match";
import { PasswordStrength } from "@/shared/components/ui/password-strength";

import { chooseNewPassword } from "../actions";
import { portals, type PortalId } from "../constants/portals";
import {
  choosePasswordSchema,
  type ChoosePasswordValues,
} from "../schemas/password-reset.schema";
import { logout } from "../services/auth.client";

/**
 * Replaces a temporary password with one the person chooses.
 *
 * <p>No "current password" field. The person proved they know the temporary one
 * seconds ago by signing in with it, and the session this runs in can do nothing
 * except this — asking for it again would be friction with nothing behind it.
 *
 * <p>On success the server has already swapped the session for a full one, so
 * the person goes straight to work rather than back to the sign-in page to type
 * the password they have just chosen.
 *
 * <p>Signing out is offered too. Someone who reached this page on a shared
 * counter machine by mistake, or who was handed the wrong temporary password,
 * needs a way off it that is not "close the browser".
 */
export function SetPasswordForm({ portal }: { portal: PortalId }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChoosePasswordValues>({
    resolver: zodResolver(choosePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: ChoosePasswordValues) => {
    setFormError(null);

    const result = await chooseNewPassword(portal, values);

    if (!result.success) {
      setFormError(result.message);
      // A password should not linger in the DOM after a failed attempt.
      reset({ password: "", confirmPassword: "" });
      return;
    }

    // `replace` keeps this page out of the back history: it has nothing to
    // offer once the password is set, and the guard would only bounce back.
    router.replace(result.landingRoute);
    router.refresh();
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await logout(portal);
    router.replace(portals[portal].loginRoute);
    router.refresh();
  };

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 sm:space-y-6"
    >
      {formError ? <Alert message={formError} /> : null}

      <PasswordField
        label="New Password"
        placeholder="••••••••"
        // Prompts a password manager to offer a generated password, and stops
        // it filling the temporary one into a field meant for its replacement.
        autoComplete="new-password"
        autoFocus
        error={errors.password?.message}
        {...register("password")}
      />

      <PasswordStrength password={watch("password") ?? ""} />

      <div className="space-y-2">
        <PasswordField
          label="Repeat New Password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <PasswordMatch
          password={watch("password") ?? ""}
          confirmation={watch("confirmPassword") ?? ""}
          error={errors.confirmPassword?.message}
        />
      </div>

      <Button type="submit" isLoading={isSubmitting} loadingText="Saving…" className="w-full">
        Save and Continue
        <ArrowRight aria-hidden className="size-4" />
      </Button>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut || isSubmitting}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
      >
        <LogOut aria-hidden className="size-4" />
        {isSigningOut ? "Signing out…" : "Not you? Sign out"}
      </button>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { PasswordField } from "@/shared/components/ui/password-field";
import { TextField } from "@/shared/components/ui/text-field";
import { routes } from "@/shared/config/app.config";

import {
  loginSchema,
  type LoginCredentials,
  type LoginFormValues,
} from "../schemas/login.schema";
import { login } from "../services/auth.client";

/**
 * Admin sign-in form.
 *
 * Validation runs locally for immediate feedback, but the credential check
 * itself happens server-side: this component posts to `/api/auth/login`, which
 * forwards to the Spring Boot API and stores the session in httpOnly cookies.
 * No token ever reaches this component.
 */
export function AdminLoginForm() {
  const router = useRouter();

  /** Form-level failure (bad credentials, throttling, network) — not field-level. */
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues, unknown, LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", rememberMe: false },
    // Validate on submit, then live-correct: nagging about a half-typed
    // username while the user is still typing it is noise, not help.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: LoginCredentials) => {
    setFormError(null);

    const outcome = await login(values);

    if (!outcome.success) {
      setFormError(outcome.message);
      return;
    }

    // The session cookie is already set by the Route Handler. `refresh()`
    // re-runs the server components so middleware/layouts see the new session,
    // and `replace` keeps the login page out of the browser's back history.
    router.replace(routes.adminDashboard);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      // Suppress native validation bubbles so our accessible, styled messages
      // are the single source of feedback.
      noValidate
      className="space-y-5 sm:space-y-6"
    >
      {formError ? <Alert message={formError} /> : null}

      <TextField
        label="Username"
        icon={User}
        placeholder="olitharanasinghe2003"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // Focus the first field on load so an admin can start typing straight
        // away — this page has no other purpose.
        autoFocus
        error={errors.username?.message}
        {...register("username")}
      />

      <PasswordField
        label="Password"
        placeholder="••••••••"
        autoComplete="current-password"
        labelAction={
          <Link
            href={routes.forgotPassword}
            // The page is not built yet; skip prefetch so it does not 404.
            prefetch={false}
            className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            Forgot Password?
          </Link>
        }
        error={errors.password?.message}
        {...register("password")}
      />

      <Checkbox
        label="Remember Me"
        className="pt-1"
        {...register("rememberMe")}
      />

      <Button
        type="submit"
        isLoading={isSubmitting}
        loadingText="Signing in…"
        className="mt-2"
      >
        Sign In
        <ArrowRight aria-hidden className="size-4" />
      </Button>
    </form>
  );
}

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

import type { PortalDefinition } from "../constants/portals";
import {
  loginSchema,
  type LoginCredentials,
  type LoginFormValues,
} from "../schemas/login.schema";
import { login } from "../services/auth.client";

/**
 * Sign-in form, shared by the admin portal and the cashier till.
 *
 * The two screens differ only in copy, in whether password recovery is offered
 * and in where a success lands — all of which arrive as a {@link PortalDefinition}.
 * The submission path itself is identical, which is the point: there is one
 * place where credentials leave the browser, not one per portal.
 *
 * Validation runs locally for immediate feedback, but the credential check
 * itself happens server-side: this component posts to the portal's
 * `/api/auth/{portal}/login` endpoint, which forwards to the Spring Boot API
 * and stores the session in httpOnly cookies. No token ever reaches this
 * component.
 */
export function LoginForm({
  portal,
  redirectTo,
}: {
  portal: PortalDefinition;
  /**
   * Where to go after signing in, when the middleware bounced the user here
   * from somewhere else.
   *
   * Read on the server and passed down rather than pulled from
   * `useSearchParams`, which would force this whole page out of static
   * prerendering for one optional string.
   */
  redirectTo?: string;
}) {
  const router = useRouter();

  /** Form-level failure (bad credentials, throttling, network) — not field-level. */
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues, unknown, LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
    // Validate on submit, then live-correct: nagging about a half-typed
    // username while the user is still typing it is noise, not help.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: LoginCredentials) => {
    setFormError(null);

    const outcome = await login(portal, values);

    if (!outcome.success) {
      setFormError(outcome.message);
      return;
    }

    // The session cookie is already set by the Route Handler. `refresh()`
    // re-runs the server components so middleware/layouts see the new session,
    // and `replace` keeps the login page out of the browser's back history.
    //
    // If the middleware bounced them here from somewhere else, send them back
    // there. Only same-origin paths are honoured: an open redirect would let a
    // crafted link carry a freshly signed-in user to another site.
    const destination =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : portal.landingRoute;

    router.replace(destination);
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
        placeholder={portal.usernamePlaceholder}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // Focus the first field on load so the user can start typing straight
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
          // Cashier accounts are reset by an administrator, so that portal
          // offers no self-service link rather than a dead end.
          portal.hasPasswordReset ? (
            <Link
              href={routes.forgotPassword}
              // The page is not built yet; skip prefetch so it does not 404.
              prefetch={false}
              className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              Forgot Password?
            </Link>
          ) : null
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
        className="mt-2 w-full"
      >
        Sign In
        <ArrowRight aria-hidden className="size-4" />
      </Button>
    </form>
  );
}

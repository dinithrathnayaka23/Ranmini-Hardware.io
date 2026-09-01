"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { routes } from "@/shared/config/app.config";

import { requestPasswordReset } from "../actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "../schemas/password-reset.schema";

/**
 * Asks for a reset link.
 *
 * <p>On success the form is replaced by a confirmation rather than left on
 * screen with a banner above it. Leaving it there invites the impatient second
 * and third submission, which is exactly the traffic the backend rate limit
 * then has to refuse — and being told "too many requests" after doing the
 * obvious thing is a poor experience.
 *
 * <p>The confirmation is deliberately worded as a conditional. It has to read
 * the same whether or not the address belongs to an account, because the
 * backend answers the same either way: a form that said "no such account" would
 * be a free tool for working out who works at the shop.
 */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setFormError(null);

    const result = await requestPasswordReset(values);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setConfirmation(result.message);
    setSentTo(values.email.trim());
  };

  if (sentTo) {
    return (
      <div className="space-y-6">
        <Alert tone="success" message={confirmation} />

        {/*
          Phrased as "check", not "we sent it to". The banner above is
          deliberately conditional — the backend will not say whether the
          address has an account — and following it with a flat claim that a
          message went out would give that away again in the next sentence.
        */}
        <p className="text-sm leading-relaxed text-muted">
          Check <span className="font-medium text-ink">{sentTo}</span>. The link
          works once and expires shortly, so use it while you are here.
        </p>

        <p className="text-sm leading-relaxed text-muted">
          Nothing arrived after a few minutes? Check the spam folder, then{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
          >
            try a different address
          </button>
          .
        </p>

        <BackToSignIn />
      </div>
    );
  }

  return (
    <form
      // Matters before hydration: a native fallback submit defaults to GET,
      // which would put the address in the URL and the server log.
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 sm:space-y-6"
    >
      {formError ? <Alert message={formError} /> : null}

      <TextField
        label="Email Address"
        icon={Mail}
        type="email"
        inputMode="email"
        placeholder="you@ranminihardware.lk"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        error={errors.email?.message}
        {...register("email")}
      />

      <Button type="submit" isLoading={isSubmitting} loadingText="Sending…" className="w-full">
        <Send aria-hidden className="size-4" />
        Send Reset Link
      </Button>

      <BackToSignIn />
    </form>
  );
}

function BackToSignIn() {
  return (
    <Link
      href={routes.adminLogin}
      className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Back to sign in
    </Link>
  );
}

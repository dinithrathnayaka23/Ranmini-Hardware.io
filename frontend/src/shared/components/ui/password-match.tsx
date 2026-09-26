"use client";

import { Check, X } from "lucide-react";

import { cn } from "@/shared/lib/cn";

/*
 * Adapted from the UI Layouts "Password — confirm check" component (MIT) — see
 * THIRD_PARTY_NOTICES.md.
 *
 * What was kept is the three-state comparison at the heart of it: untouched,
 * matching, and not matching — and the point that the third state is only worth
 * showing once the repeat box has something in it, since a confirmation field
 * mid-typing disagrees with the password on almost every keystroke.
 *
 * What was dropped is the rest of their example. It ships as a whole sign-up
 * form with its own inputs, its own show/hide eye and a hover card listing five
 * character-class rules, all of which this app already has better versions of:
 * `PasswordField` owns the input and the eye, and `PasswordStrength` states the
 * rules this backend genuinely enforces rather than five it does not. Their red
 * and green borders on the input are gone too — the field already has an error
 * state, and a second colour convention on the same control would contradict it.
 */

/**
 * Says whether the repeat-password box agrees with the password above it, while
 * it is being typed.
 *
 * <p><b>Why it is worth a component.</b> A mistyped confirmation was previously
 * only discovered by pressing the submit button, and on three of the four forms
 * that use it the submit handler clears both password boxes — so the reward for
 * a single wrong keystroke was retyping a password nobody can see. Saying so
 * while the person is still looking at the field costs nothing and saves the
 * round trip.
 *
 * <p><b>Silent while the field is untouched, and silent while the form's own
 * validation is talking.</b> A red "do not match" under an empty box is an error
 * the person has not had the chance to make yet; repeating the resolver's
 * message underneath the resolver's own message is just noise. Passing `error`
 * hands the field back to whichever one is already speaking.
 *
 * <p><b>`role="status"`, politely.</b> The result is announced between
 * keystrokes rather than interrupting, which is what an assertive live region
 * would do to somebody halfway through typing a password.
 *
 * <p>Both values are read from form state that is already watched for the
 * strength meter above, so this adds no new place the plaintext lives.
 */
export function PasswordMatch({
  password,
  confirmation,
  error,
  className,
}: {
  password: string;
  confirmation: string;
  /**
   * The confirmation field's own validation message, when it has one. Given
   * here so this line stays quiet rather than saying the same thing twice.
   */
  error?: string;
  className?: string;
}) {
  // Nothing typed, or the field is already showing its own error.
  if (!confirmation || error) return null;

  const matches = password === confirmation;
  const Icon = matches ? Check : X;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        matches ? "text-success" : "text-danger",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {matches ? "Both passwords match" : "The two passwords are different"}
    </p>
  );
}

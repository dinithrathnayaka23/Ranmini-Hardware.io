"use client";

import { Mail, UserRound } from "lucide-react";
import * as React from "react";

import {
  SegmentedControl,
  type SegmentedOption,
} from "@/shared/components/ui/segmented-control";

import { ForgotPasswordForm } from "./forgot-password-form";
import { PasswordHelpForm } from "./password-help-form";

type Method = "owner" | "email";

/**
 * "Ask the owner" first. Most cashier accounts are created without an email
 * address, so the emailed link cannot reach them, and the option that works for
 * most people belongs where the eye lands.
 */
const METHODS: readonly SegmentedOption<Method>[] = [
  { value: "owner", label: "Ask owner", icon: UserRound },
  { value: "email", label: "Use email", icon: Mail },
];

const HINTS: Record<Method, string> = {
  owner:
    "Enter your username. The owner will be asked to give you a temporary password, and you will choose your own when you sign in.",
  email:
    "If your account has an email address, we can send you a link to choose a new password yourself.",
};

/**
 * The till's two ways back into an account.
 *
 * <p>One page with a switch rather than two pages, because a cashier often does
 * not know whether an email address was ever put on their account. Being able to
 * flip between the routes without navigating away makes trying the other one
 * cheap.
 */
export function CashierRecovery() {
  const [method, setMethod] = React.useState<Method>("owner");

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="How to reset your password"
        options={METHODS}
        value={method}
        onChange={setMethod}
        size="md"
        fullWidth
      />

      <p className="text-sm leading-relaxed text-muted">{HINTS[method]}</p>

      {/* Keyed so switching routes starts the other form fresh, rather than
          carrying one form's error or confirmation into the other. */}
      {method === "owner" ? (
        <PasswordHelpForm key="owner" portal="cashier" />
      ) : (
        <ForgotPasswordForm key="email" portal="cashier" />
      )}
    </div>
  );
}

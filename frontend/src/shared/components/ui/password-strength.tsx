"use client";

import { Check, Minus } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

/*
 * Adapted from the UI Layouts "Password — strength indicator" component (MIT) —
 * see THIRD_PARTY_NOTICES.md. The meter and checklist are theirs; the colours
 * now come from the theme tokens, and the rules match what this backend
 * actually enforces.
 */

interface Rule {
  label: string;
  test: (password: string) => boolean;
}

/**
 * Advice rather than requirements.
 *
 * The API enforces a minimum length and nothing else, so only length is
 * presented as a rule. Listing mixed case or symbols as *requirements* would
 * make the form reject passwords the server would happily accept. A long
 * passphrase of plain words is a good password, and it would fail most of these
 * checks.
 */
const ADVICE: Rule[] = [
  { label: "Upper and lower case letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p) => /[0-9]/.test(p) },
  { label: "A symbol, or 12+ characters", test: (p) => /[^A-Za-z0-9]/.test(p) || p.length >= 12 },
];

const LEVELS = [
  { label: "Too short", bar: "bg-danger", text: "text-danger" },
  { label: "Weak", bar: "bg-danger", text: "text-danger" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Good", bar: "bg-success", text: "text-success" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
] as const;

/**
 * A strength meter and checklist shown under a new-password field.
 *
 * <p>Renders nothing until something has been typed. A red "Too short" under an
 * empty field reads as an error the person has not yet had the chance to make.
 *
 * <p>Four segments rather than one continuous bar, and every level is also
 * written out in words, so the meter never relies on colour alone.
 */
export function PasswordStrength({
  password,
  minLength = 8,
  className,
}: {
  password: string;
  /** The shop's configured minimum. The server checks it again either way. */
  minLength?: number;
  className?: string;
}) {
  const id = React.useId();

  if (!password) return null;

  const meetsMinimum = password.length >= minLength;
  const adviceMet = ADVICE.map((rule) => rule.test(password));

  // Below the minimum nothing else counts, however varied the characters.
  const score = meetsMinimum ? 1 + adviceMet.filter(Boolean).length : 0;
  const level = LEVELS[score];

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-3">
        <div
          role="meter"
          aria-labelledby={`${id}-label`}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={score}
          aria-valuetext={level.label}
          className="grid flex-1 grid-cols-4 gap-1"
        >
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1.5 rounded-full transition-colors duration-300",
                score >= segment ? level.bar : "bg-line",
              )}
            />
          ))}
        </div>

        <span
          id={`${id}-label`}
          className={cn("w-16 shrink-0 text-right text-xs font-medium", level.text)}
        >
          {level.label}
        </span>
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Password guidance">
        <Item met={meetsMinimum} label={`At least ${minLength} characters`} required />
        {ADVICE.map((rule, index) => (
          <Item key={rule.label} met={adviceMet[index]} label={rule.label} />
        ))}
      </ul>
    </div>
  );
}

function Item({ met, label, required }: { met: boolean; label: string; required?: boolean }) {
  const Icon = met ? Check : Minus;

  return (
    <li className="flex items-center gap-2 text-xs">
      <Icon
        aria-hidden
        className={cn("size-3.5 shrink-0", met ? "text-success" : "text-placeholder")}
      />
      <span className={met ? "text-ink-soft" : "text-muted"}>
        {label}
        {required ? <span className="text-muted"> (required)</span> : null}
        <span className="sr-only">{met ? ", done" : ", not yet"}</span>
      </span>
    </li>
  );
}

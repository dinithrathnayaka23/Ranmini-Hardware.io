"use client";

import { KeyRound, UserCheck, UserX } from "lucide-react";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { PasswordField } from "@/shared/components/ui/password-field";

import { changeStaffPassword, setStaffActive } from "../actions";
import type { StaffMember } from "../types/staff.types";

/**
 * The two things an admin does to somebody else's account: reset the password,
 * or stop them signing in.
 *
 * <p>Both are deliberately a little effortful. The password form has to be
 * opened before it can be used, and deactivation asks for confirmation, because
 * these sit in a list where the row above and the row below look identical and
 * a misplaced click would otherwise lock the wrong person out mid-shift.
 */
export function StaffRowActions({ staff }: { staff: StaffMember }) {
  const [isResetting, setIsResetting] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [isConfirmingDisable, setIsConfirmingDisable] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: AlertTone; message: string } | null>(
    null,
  );

  const isActive = staff.status === "ACTIVE";

  const handleResetPassword = async () => {
    setIsPending(true);
    const result = await changeStaffPassword(staff.id, password);
    setIsPending(false);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    if (result.success) {
      // The new password must not linger in the DOM once it has been set.
      setPassword("");
      setIsResetting(false);
    }
  };

  const handleToggleActive = async () => {
    setIsPending(true);
    const result = await setStaffActive(staff.id, !isActive);
    setIsPending(false);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });
    setIsConfirmingDisable(false);
  };

  return (
    <div className="space-y-3">
      {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setIsResetting((open) => !open);
            setNotice(null);
          }}
        >
          <KeyRound aria-hidden className="size-4" />
          {isResetting ? "Cancel" : "Set password"}
        </Button>

        {isConfirmingDisable ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConfirmingDisable(false)}
            >
              Keep active
            </Button>
            <Button
              size="sm"
              isLoading={isPending}
              loadingText="Working…"
              onClick={handleToggleActive}
              className="bg-danger hover:bg-danger/90"
            >
              <UserX aria-hidden className="size-4" />
              Confirm deactivate
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            isLoading={isPending && !isResetting}
            loadingText="Working…"
            onClick={() =>
              isActive ? setIsConfirmingDisable(true) : void handleToggleActive()
            }
          >
            {isActive ? (
              <>
                <UserX aria-hidden className="size-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck aria-hidden className="size-4" />
                Reactivate
              </>
            )}
          </Button>
        )}
      </div>

      {isResetting ? (
        <div className="space-y-3 rounded-lg border border-line bg-canvas-subtle p-3">
          <PasswordField
            label={`New password for ${staff.fullName}`}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            // `new-password` stops a password manager offering the signed-in
            // admin's own credentials for a colleague's account.
            autoComplete="new-password"
          />
          <p className="text-xs leading-relaxed text-muted">
            Give this to {staff.fullName} directly. It is not shown again.
          </p>
          <Button
            size="sm"
            isLoading={isPending}
            loadingText="Saving…"
            disabled={password.length < 8}
            onClick={handleResetPassword}
          >
            Save password
          </Button>
        </div>
      ) : null}
    </div>
  );
}

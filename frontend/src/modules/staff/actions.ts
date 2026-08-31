"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import {
  staffQuickAddSchema,
  type StaffQuickAddValues,
} from "./schemas/staff-quick-add.schema";

/**
 * Creating and managing staff accounts, from the admin portal.
 *
 * <p>Server Actions rather than route handlers: the session token is in an
 * httpOnly cookie the browser cannot read, so the call to the backend has to
 * happen on the server anyway, and an action keeps that from becoming a
 * hand-written endpoint per mutation.
 *
 * <p>Every action re-validates its input even though the form already did. A
 * Server Action is a public endpoint — Next.js exposes it over HTTP — so the
 * browser's checks are a convenience and this is the one that counts.
 */

export type StaffActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

/**
 * Adds a cashier (or a second admin) and sets their first password.
 *
 * <p>The password is chosen here by the admin and handed to the person
 * directly, which is what the shop actually does. Emailing an invitation would
 * mean depending on a mail server the business does not have.
 */
export async function createStaffMember(
  values: StaffQuickAddValues,
): Promise<StaffActionResult> {
  const parsed = staffQuickAddSchema.safeParse(values);

  if (!parsed.success) {
    // The form shows per-field messages itself; this is the backstop for a
    // caller that did not go through the form at all.
    return { success: false, message: "Those details are not valid." };
  }

  const { fullName, username, role, initialPassword } = parsed.data;

  try {
    await apiFetch("/api/v1/staff", {
      method: "POST",
      body: { fullName, username, role, password: initialPassword },
    });

    // Both screens list this person now.
    revalidatePath(routes.adminStaff);
    revalidatePath(routes.adminDashboard);

    return {
      success: true,
      message: `${fullName} can now sign in as ${
        role === "ADMIN" ? "an admin" : "a cashier"
      } with the username ${username}.`,
    };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

/** Sets a new password for someone who has forgotten theirs. */
export async function changeStaffPassword(
  staffId: string,
  password: string,
): Promise<StaffActionResult> {
  if (typeof password !== "string" || password.length < 8) {
    return { success: false, message: "The password must be at least 8 characters." };
  }

  try {
    await apiFetch(`/api/v1/staff/${staffId}/password`, {
      method: "POST",
      body: { password },
    });
    revalidatePath(routes.adminStaff);
    return { success: true, message: "Password updated. Give it to them directly." };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

/**
 * Deactivates or restores an account.
 *
 * <p>Nothing is deleted: every sale this person rang up names them, and a
 * receipt whose cashier cannot be identified is exactly the gap an audit looks
 * for. They simply stop being able to sign in.
 */
export async function setStaffActive(
  staffId: string,
  active: boolean,
): Promise<StaffActionResult> {
  try {
    await apiFetch(
      active ? `/api/v1/staff/${staffId}/reactivate` : `/api/v1/staff/${staffId}`,
      { method: active ? "POST" : "DELETE" },
    );
    revalidatePath(routes.adminStaff);
    return {
      success: true,
      message: active
        ? "Account reactivated."
        : "Account deactivated. They can no longer sign in.",
    };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

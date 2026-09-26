"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import {
  staffEmailSchema,
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

  const { fullName, username, role, email, initialPassword } = parsed.data;

  try {
    await apiFetch("/api/v1/staff", {
      method: "POST",
      session: "admin",
      // A blank address is left out entirely, so the account has none rather
      // than an empty one.
      body: { fullName, username, role, email: email || undefined, password: initialPassword },
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

/**
 * Sets a temporary password for someone who has forgotten theirs.
 *
 * <p>Temporary because the administrator knows it. The backend makes the
 * person choose their own the next time they sign in.
 */
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
      session: "admin",
      body: { password },
    });
    revalidatePath(routes.adminStaff);
    return {
      success: true,
      message:
        "Temporary password set. Give it to them in person; they will choose their own when they next sign in.",
    };
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
      { method: active ? "POST" : "DELETE", session: "admin" },
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

/**
 * Adds, changes or removes the email address on somebody's account.
 *
 * <p>The address is what lets a person reset a forgotten password themselves,
 * by email, instead of asking the owner. Blank removes it.
 *
 * <p>The API's update replaces the whole editable profile, so the other fields
 * are read fresh from the server and sent back unchanged, rather than taken
 * from the browser — this action can change the email and nothing else.
 */
export async function setStaffEmail(
  staffId: string,
  email: string,
): Promise<StaffActionResult> {
  const parsed = staffEmailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const address = parsed.data;

  try {
    const current = await apiFetch<{
      fullName: string;
      phone: string | null;
      role: string;
      joinedOn: string | null;
    }>(`/api/v1/staff/${encodeURIComponent(staffId)}`, { session: "admin" });

    await apiFetch(`/api/v1/staff/${encodeURIComponent(staffId)}`, {
      method: "PUT",
      session: "admin",
      body: {
        fullName: current.fullName,
        phone: current.phone,
        role: current.role,
        joinedOn: current.joinedOn,
        email: address || null,
      },
    });

    revalidatePath(routes.adminStaff);
    return {
      success: true,
      message: address
        ? `Saved. ${current.fullName} can now reset a forgotten password by email.`
        : `Email removed. ${current.fullName} can still ask you for a reset from the sign-in page.`,
    };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch, apiFetchMultipart } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import {
  changePasswordSchema,
  profileDetailsSchema,
  type ChangePasswordValues,
  type ProfileDetailsValues,
} from "./schemas/profile.schema";

/**
 * Editing your own account.
 *
 * <p>None of these take an id. The API works out who you are from the session
 * token, so there is no account but your own to address and no ownership check
 * that could be got wrong here.
 */

export type ProfileActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

/**
 * Paths that show the signed-in person's name or picture.
 *
 * <p>Revalidated together after any change, because the portal chrome renders
 * the account menu on every screen — updating only the profile page would leave
 * the old name in the top bar until the next hard reload.
 */
const AFFECTED_PATHS = [routes.adminProfile, routes.adminDashboard, routes.adminStaff];

export async function saveProfileDetails(
  values: ProfileDetailsValues,
): Promise<ProfileActionResult> {
  const parsed = profileDetailsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: "Those details are not valid." };
  }

  try {
    await apiFetch("/api/v1/profile", {
      method: "PATCH",
      session: "admin",
      body: {
        fullName: parsed.data.fullName,
        // An empty field means "no value", not "the empty string" — the API
        // stores null and the initials fallback depends on the difference.
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      },
    });

    AFFECTED_PATHS.forEach((path) => revalidatePath(path));
    return { success: true, message: "Your details have been saved." };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

export async function changeMyPassword(
  values: ChangePasswordValues,
): Promise<ProfileActionResult> {
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    await apiFetch("/api/v1/profile/password", {
      method: "POST",
      session: "admin",
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
    });

    // Deliberately no revalidation: nothing on screen shows a password, and the
    // existing session stays valid because the token was issued before the
    // change and is not invalidated by it.
    return { success: true, message: "Your password has been changed." };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

/**
 * Uploads a new profile picture.
 *
 * <p>Takes {@link FormData} rather than bytes: a file cannot be serialised into
 * a plain action argument, and passing it through as form data means the browser
 * streams it rather than the page holding a base64 copy of it in memory.
 */
export async function uploadAvatar(formData: FormData): Promise<ProfileActionResult> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Choose a picture to upload." };
  }

  // Checked here for a quick, clear message; the API checks the bytes
  // themselves, which is the check that actually decides.
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { success: false, message: "Use a PNG, JPEG or WebP image." };
  }
  if (file.size > 512 * 1024) {
    return { success: false, message: "The picture must be smaller than 512 KB." };
  }

  try {
    const upload = new FormData();
    upload.append("file", file, file.name || "avatar");

    await apiFetchMultipart("/api/v1/profile/avatar", upload, "admin");

    AFFECTED_PATHS.forEach((path) => revalidatePath(path));
    return { success: true, message: "Your picture has been updated." };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

export async function removeAvatar(): Promise<ProfileActionResult> {
  try {
    await apiFetch("/api/v1/profile/avatar", { method: "DELETE", session: "admin" });

    AFFECTED_PATHS.forEach((path) => revalidatePath(path));
    return { success: true, message: "Your picture has been removed." };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

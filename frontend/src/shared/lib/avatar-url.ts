/**
 * Where a person's profile picture is served from.
 *
 * The version is part of the URL rather than a header, which is what lets the
 * response be cached immutably: a changed picture is a different URL, so the
 * browser never has to be told the old one went stale.
 *
 * @returns null when the person has no picture, which is what makes the Avatar
 *   component fall back to their initials.
 */
export function avatarUrlFor(
  staffId: string,
  avatarVersion: string | null | undefined,
): string | null {
  if (!avatarVersion) return null;
  return `/api/avatars/${encodeURIComponent(staffId)}?v=${encodeURIComponent(avatarVersion)}`;
}

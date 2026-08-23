/**
 * Derives avatar initials from a person's name, e.g. "Olitha Ranasinghe" -> "OR".
 *
 * Lives in `shared/` because both the portal chrome and the staff screens need
 * it, and a feature module must never import from another feature module.
 */
export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

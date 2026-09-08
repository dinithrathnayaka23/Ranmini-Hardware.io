"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/shared/components/theme/theme-toggle";

/**
 * The theme toggle on the sign-in screens — offered to administrators only.
 *
 * <p>Without this there is nowhere to change the theme while signed out. The
 * toggle in the portal's top bar is behind the very screen an administrator
 * would want to change, so somebody who prefers dark would meet a white page
 * every time they signed in and could do nothing about it until they were
 * already through.
 *
 * <p>Hidden on the till's sign-in page, because everything under `/cashier`
 * renders light whatever the stored preference says (see `theme-script.tsx`).
 * A control that visibly does nothing is worse than no control, and a cashier
 * has no use for one either way.
 *
 * <p>The `(auth)` layout is shared by both portals and, being a Server
 * Component, cannot tell which one it is wrapping — hence the pathname check
 * here rather than a prop threaded down from each page.
 */
export function AuthThemeToggle() {
  const pathname = usePathname();

  if (pathname.startsWith("/cashier")) return null;

  return <ThemeToggle />;
}

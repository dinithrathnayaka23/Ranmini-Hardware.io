"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/shared/components/brand/logo";
import { appConfig } from "@/shared/config/app.config";

import { portalFromPathname } from "../constants/portals";

/**
 * Brand lockup in the sign-in header.
 *
 * The `(auth)` layout is shared by both portals and, being a Server Component,
 * cannot know which one it is wrapping. This reads the pathname so the mark
 * always returns the user to the sign-in screen they came from — a cashier who
 * clicks the logo should not land on the admin door.
 */
export function AuthBrandLink() {
  const portal = portalFromPathname(usePathname());

  return (
    <Link
      href={portal.loginRoute}
      aria-label={`${appConfig.name} home`}
      className="inline-flex rounded-lg"
    >
      <Logo />
    </Link>
  );
}

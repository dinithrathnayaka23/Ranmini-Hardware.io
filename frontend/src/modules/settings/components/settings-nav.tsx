"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/cn";

import { settingsSections } from "../constants/settings-sections";

/**
 * Section navigation for the settings screen.
 *
 * A real list of links rather than tab state: each section is its own route, so
 * it can be linked to and reached with the back button. `aria-current` marks
 * the active row for assistive tech, not just the tinted background.
 *
 * The tint slides between sections rather than jumping, using the same
 * sliding-indicator technique as the sidebar.
 */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    // `min-w-0` is load-bearing: as a grid item the nav defaults to
    // `min-width: auto`, so it refuses to shrink below the combined width of
    // its four links and the inner scroll never engages — pushing the whole
    // page sideways on a phone instead.
    <nav aria-label="Settings sections" className="min-w-0">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {settingsSections.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <li key={href} className="shrink-0 lg:shrink">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "font-medium text-brand-700"
                    : "text-ink-soft hover:bg-canvas-subtle",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="settings-nav-highlight"
                    aria-hidden
                    className="absolute inset-0 rounded-lg bg-brand-50"
                  />
                ) : null}
                <Icon aria-hidden className="relative size-[18px] shrink-0" />
                <span className="relative">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

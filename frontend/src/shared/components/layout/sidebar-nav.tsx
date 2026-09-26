"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { isNavItemActive, portalNavItems } from "@/shared/config/navigation";
import { cn } from "@/shared/lib/cn";

/**
 * Primary navigation rows.
 *
 * Extracted from the sidebar shell because it is the one piece that needs the
 * current pathname — keeping the `usePathname` hook here lets the surrounding
 * chrome stay static.
 *
 * The highlight behind the current row is one element that slides from the old
 * row to the new one on navigation — the sliding-indicator technique from the
 * UI Layouts tabs (see THIRD_PARTY_NOTICES.md). Its id is per instance, because
 * the rail and the mobile drawer each render this list, and a shared id would
 * send the highlight flying from the hidden rail into the drawer.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const highlightId = React.useId();

  return (
    <nav aria-label="Primary" className="px-3 py-4">
      <ul className="space-y-1">
        {portalNavItems.map(({ label, href, icon: Icon }) => {
          const isActive = isNavItemActive(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                // Marks the row for assistive tech, not just visually.
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "font-medium text-white"
                    : "text-rail-muted hover:bg-rail-raised/60 hover:text-white",
                )}
              >
                {/* The highlight and its accent bar travel together. */}
                {isActive ? (
                  <motion.span
                    layoutId={highlightId}
                    aria-hidden
                    className="absolute inset-0 rounded-lg bg-rail-raised"
                  >
                    <span className="absolute inset-y-1.5 right-0 w-1 rounded-l-full bg-brand-500" />
                  </motion.span>
                ) : null}

                {/* `z-10`, not just `relative`: mid-slide the highlight passes
                    over other rows, and without it a later row's highlight
                    paints over an earlier row's label for the whole slide. */}
                <Icon aria-hidden className="relative z-10 size-[18px] shrink-0" />
                <span className="relative z-10 truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

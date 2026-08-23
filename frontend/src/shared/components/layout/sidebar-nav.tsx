"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, portalNavItems } from "@/shared/config/navigation";
import { cn } from "@/shared/lib/cn";

/**
 * Primary navigation rows.
 *
 * Extracted from the sidebar shell because it is the one piece that needs the
 * current pathname — keeping the `usePathname` hook here lets the surrounding
 * chrome stay static.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

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
                    ? "bg-rail-raised font-medium text-white"
                    : "text-rail-muted hover:bg-rail-raised/60 hover:text-white",
                )}
              >
                <Icon aria-hidden className="size-[18px] shrink-0" />
                <span className="truncate">{label}</span>

                {/* Accent bar on the trailing edge of the current section. */}
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-1.5 right-0 w-1 rounded-l-full bg-brand-500"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

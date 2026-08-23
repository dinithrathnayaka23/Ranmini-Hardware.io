import Link from "next/link";

import { LogoutButton } from "@/modules/auth/components/logout-button";
import { appConfig, routes } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";

import { SidebarNav } from "./sidebar-nav";

/**
 * The dark navigation rail.
 *
 * Rendered twice — statically at `lg` and up, and inside the mobile drawer —
 * from this single definition, so the two can never drift apart.
 */
export function Sidebar({
  className,
  onNavigate,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  onNavigate?: () => void;
}) {
  return (
    <div
      className={cn("flex h-full w-64 flex-col bg-rail", className)}
      {...props}
    >
      {/* ------------------------------- Brand ------------------------------- */}
      <div className="shrink-0 px-5 py-5">
        <Link
          href={routes.adminDashboard}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg"
        >
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-base font-bold text-rail"
          >
            {appConfig.name.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.95rem] font-semibold tracking-tight text-white">
              {appConfig.name}
            </span>
            <span className="block truncate text-xs text-rail-muted">
              Management System
            </span>
          </span>
        </Link>
      </div>

      {/* Nav takes the leftover height and scrolls on its own if the list ever
          outgrows a short window, so the profile below stays reachable. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>

      {/* ------------------------------- Sign out ------------------------------ */}
      {/* Who is signed in now lives in the top bar's account menu, so the rail
          ends with the one action rather than repeating the identity. */}
      <div className="shrink-0 border-t border-rail-line p-3">
        <LogoutButton onNavigate={onNavigate} />
      </div>
    </div>
  );
}

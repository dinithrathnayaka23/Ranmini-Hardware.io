import type { LucideIcon } from "lucide-react";

/**
 * Stand-in for a portal section that has not been designed yet.
 *
 * These exist so the sidebar is honest: every nav row leads somewhere and
 * says plainly that the screen is still to come, rather than dead-ending on a
 * 404 that looks like a bug. Delete each one as its real page lands.
 */
export function SectionPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      </header>

      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-20 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-canvas-subtle text-muted"
        >
          <Icon className="size-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-ink">
          This section is not built yet
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          The design for {title.toLowerCase()} has not been implemented. It will
          appear here once the screen is ready.
        </p>
      </div>
    </div>
  );
}

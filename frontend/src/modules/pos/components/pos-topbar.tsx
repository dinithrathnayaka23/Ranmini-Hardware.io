import { Logo } from "@/shared/components/brand/logo";
import { appConfig } from "@/shared/config/app.config";

import { PosClock } from "./pos-clock";
import { PosSignOut } from "./pos-sign-out";

/**
 * The till's own chrome: who is signed in, which terminal this is, and the way
 * out.
 *
 * Distinct from the admin portal's top bar because a cashier has no navigation
 * — there is exactly one screen — so the bar carries identity rather than
 * wayfinding.
 */
export function PosTopbar({
  terminalName,
  cashierName,
}: {
  terminalName: string;
  cashierName: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-3 sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
        {/* Mark only: the shop name is already rendered beside it, and a second
            copy inside a 32px circle would just be noise. */}
        <Logo markOnly size={32} className="shrink-0" />

        {/* The short name on a phone: at 390px the full lockup truncates to
            "Ranmini Hard…", which is worse than simply saying "Ranmini" and
            leaving room for the terminal number beside it. */}
        <span className="truncate text-lg font-bold tracking-tight text-brand-700 sm:text-xl">
          <span className="sm:hidden">{appConfig.shortName}</span>
          <span className="hidden sm:inline">{appConfig.name}</span>
        </span>
        <span aria-hidden className="h-6 w-px shrink-0 bg-line" />
        <span className="truncate text-sm font-medium text-ink-soft sm:text-[0.95rem]">
          {terminalName}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        {/* Hidden on the narrowest screens: on a phone the logout control is
            what matters, and the name would crowd it off the bar. */}
        <div className="hidden text-right text-sm leading-tight sm:block">
          <p className="text-ink-soft">Cashier: {cashierName}</p>
          <p className="text-muted">
            <PosClock />
          </p>
        </div>

        <PosSignOut />
      </div>
    </header>
  );
}

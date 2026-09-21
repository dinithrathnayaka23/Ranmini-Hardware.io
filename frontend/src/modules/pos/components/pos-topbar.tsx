import { Logo } from "@/shared/components/brand/logo";
import { appConfig } from "@/shared/config/app.config";

import type { TillAlertFeed } from "../types/pos.types";

import { PosClock } from "./pos-clock";
import { PosSignOut } from "./pos-sign-out";
import { TillAlertBell } from "./till-alert-bell";

/**
 * The till's own chrome: who is signed in, which terminal this is, and the way
 * out.
 *
 * Distinct from the admin portal's top bar because a cashier has no navigation
 * — there is exactly one screen — so the bar carries identity rather than
 * wayfinding.
 *
 * The one exception is the stock-alert bell, which earns its place here because
 * it is the only thing on the till that is about something other than the sale
 * in progress, and the cashier needs to be able to reach it between customers
 * rather than only when a sale happens to raise it.
 */
export function PosTopbar({
  terminalName,
  cashierName,
  alerts,
}: {
  terminalName: string;
  cashierName: string;
  alerts: TillAlertFeed;
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
        {/* Ahead of the cashier's name, not after it. The name and the clock are
            standing information — read once at the start of a shift and never
            again — while the bell is the one control here that changes during
            one. Putting it first keeps it away from the sign-out button too,
            which is the neighbour you least want a thumb to miss. */}
        <TillAlertBell feed={alerts} />

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

import Link from "next/link";

import { BrandShowcase } from "@/modules/auth/components/brand-showcase";
import { Logo } from "@/shared/components/brand/logo";
import { appConfig, routes } from "@/shared/config/app.config";

/**
 * Shell shared by every unauthenticated screen (sign in, forgot password,
 * password reset).
 *
 * Layout is a two-column split from `lg` up: the form column carries the brand
 * header and legal footer, beside a presentational showcase panel.
 *
 * Below `lg` the showcase is dropped entirely — a decorative photograph is not
 * worth the bandwidth or the vertical space on a phone — and the form column
 * centres itself in the viewport instead of clinging to the left edge, which
 * is what makes the tablet range look deliberate rather than unfinished.
 *
 * HEIGHT STRATEGY
 *
 * From `lg` the shell is pinned to exactly one viewport (`h-dvh`) so a desktop
 * or laptop never scrolls the page: the header sits at the top, the footer at
 * the bottom, and the form absorbs whatever slack is left in between. The
 * showcase photograph fills its column edge to edge.
 *
 * The escape hatch matters as much as the rule. On a short window — a 1280x600
 * browser, or a laptop with the OS zoom turned up — the form can genuinely need
 * more height than there is. Rather than clip it, the form column alone gets an
 * `overflow-y-auto` scrollbar while the page and the photograph stay put. That
 * only ever engages when the alternative would be an unreachable Sign In
 * button, so in practice it is invisible.
 *
 * Below `lg` the height is a *minimum*, not a cap, and the page scrolls
 * normally — a phone keyboard can take half the screen, and locking the
 * viewport there would trap the user.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* ---------------------------- Form column ---------------------------- */}
      {/* Padding eases off between lg and xl: at 1024px the form column is only
          ~410px wide, and wider gutters would squeeze the footer onto two lines. */}
      <div className="flex flex-col px-6 py-6 sm:px-10 sm:py-10 lg:overflow-y-auto lg:px-10 lg:py-8 xl:px-24">
        <header className="mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:max-w-80">
          <Link
            href={routes.adminLogin}
            aria-label={`${appConfig.name} home`}
            className="inline-flex rounded-lg"
          >
            <Logo />
          </Link>
        </header>

        {/* `flex-1` absorbs the leftover height and centres the form in it;
            `shrink-0` stops it collapsing when the window is too short, so the
            column scrolls instead of the Sign In button being cut off. */}
        <main
          className="mx-auto flex w-full max-w-sm flex-1 shrink-0 flex-col justify-center
                     py-6 sm:py-10 lg:mx-0 lg:max-w-80 lg:py-8"
        >
          {children}
        </main>

        <footer className="mx-auto w-full max-w-sm shrink-0 pt-8 sm:pt-10 lg:mx-0 lg:max-w-80 lg:pt-6">
          <div className="border-t border-line pt-5">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8rem] text-muted">
              <li>
                {/* Fixed year: `new Date()` here would be frozen at build
                    time on this statically rendered page anyway. */}
                &copy; {appConfig.copyrightStartYear} {appConfig.legalEntity}
              </li>
              <li>
                <Link
                  href={routes.support}
                  prefetch={false}
                  className="transition-colors hover:text-ink-soft"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  href={routes.privacy}
                  prefetch={false}
                  className="transition-colors hover:text-ink-soft"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </footer>
      </div>

      {/* -------------------------- Showcase column -------------------------- */}
      <BrandShowcase className="hidden lg:block" />
    </div>
  );
}

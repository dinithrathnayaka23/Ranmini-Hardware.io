import { AuthBrandLink } from "@/modules/auth/components/auth-brand-link";
import { AuthThemeToggle } from "@/modules/auth/components/auth-theme-toggle";
import { BrandShowcase } from "@/modules/auth/components/brand-showcase";
import { appConfig } from "@/shared/config/app.config";

/**
 * Shell shared by every unauthenticated screen — both portals' sign-in pages,
 * plus forgot password and password reset.
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
 *
 * WHERE THE CARD COMES AND GOES
 *
 * Below `lg` the form sits on a card: a raised white panel on a tinted ground,
 * the same treatment the portal gives every other panel. That range is the one
 * that needed it — with the photograph dropped, the form was previously a
 * column of controls floating in the middle of an otherwise empty white page,
 * with nothing to say where the screen's content began or ended.
 *
 * From `lg` the card dissolves and the form goes back to sitting directly on
 * the column. It is not needed there, because the split against the photograph
 * already frames it — and it would not fit comfortably anyway: at 1024px the
 * form column is about 410px wide, so a bordered, padded panel inside it would
 * leave the inputs narrower than they are today. Structure at the size that
 * lacks it, nothing at the size that already has it.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The tinted ground is what makes the card below `lg` read as raised. From
    // `lg` the card is gone, so the column goes back to the plain canvas.
    <div className="grid min-h-dvh bg-canvas-subtle lg:h-dvh lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:bg-canvas">
      {/* ---------------------------- Form column ---------------------------- */}
      {/* Padding eases off between lg and xl: at 1024px the form column is only
          ~410px wide, and wider gutters would squeeze the footer onto two lines. */}
      <div className="flex flex-col px-6 py-6 sm:px-10 sm:py-10 lg:overflow-y-auto lg:px-10 lg:py-8 xl:px-24">
        <header className="mx-auto flex w-full max-w-sm shrink-0 items-center justify-between gap-4 lg:mx-0 lg:max-w-80">
          <AuthBrandLink />

          {/* Administrators only, and absent on the till — see the component. */}
          <AuthThemeToggle />
        </header>

        {/* `flex-1` absorbs the leftover height and centres the form in it;
            `shrink-0` stops it collapsing when the window is too short, so the
            column scrolls instead of the Sign In button being cut off. */}
        <main
          className="mx-auto flex w-full max-w-sm flex-1 shrink-0 flex-col justify-center
                     py-6 sm:py-10 lg:mx-0 lg:max-w-80 lg:py-8"
        >
          <div
            className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8
                       lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
          >
            {children}
          </div>
        </main>

        {/*
          The copyright and nothing else.

          It carried Support and Privacy links beside it, both pointing at pages
          that were never built — so the only two controls on a sign-in screen
          besides the form itself led to a 404. One line reads as a footer; three
          items, two of them broken, read as navigation.
        */}
        <footer className="mx-auto w-full max-w-sm shrink-0 pt-8 sm:pt-10 lg:mx-0 lg:max-w-80 lg:pt-6">
          {/* Centred rather than matching the header/form's left edge at `lg`.
              A single short line reads as an aside, and an aside sitting flush
              against the rule above it looks like a stray label rather than a
              line on its own — centring it under the rule is what makes it read
              as a footer instead. */}
          <p className="border-t border-line pt-5 text-center text-[0.8rem] text-muted">
            {/* Fixed year: `new Date()` here would be frozen at build time on
                this statically rendered page anyway. */}
            &copy; {appConfig.copyrightStartYear} {appConfig.legalEntity}
          </p>
        </footer>
      </div>

      {/* -------------------------- Showcase column -------------------------- */}
      <BrandShowcase className="hidden lg:block" />
    </div>
  );
}

# Ranmini-Hardware.io

POS and inventory management web application for Ranmini Hardware, Karadupona, Kegalle.

## Architecture

A **modular monolith** deployed as a **client–server** pair:

```
┌──────────────────────────┐        ┌──────────────────────────┐        ┌──────────┐
│  frontend/ (Next.js)     │        │  backend/ (Spring Boot)  │        │ MongoDB  │
│                          │        │                          │        │          │
│  Browser  ──►  Route     │  HTTPS │  REST API                │        │          │
│                Handlers  │ ─────► │  /api/v1/**              │ ─────► │          │
│                (BFF)     │        │                          │        │          │
└──────────────────────────┘        └──────────────────────────┘        └──────────┘
```

The browser never calls Spring Boot directly. It talks to the Next.js app's own
origin, and the Route Handlers act as a **backend-for-frontend**: they hold the
API address, forward the request server-side, and store the returned session in
`httpOnly` cookies. This keeps tokens out of JavaScript and lets the API live on
a private network.

Each layer is organised by feature module, not by file type:

```
frontend/src/
├── app/                      # Routing only — thin, delegates to modules
│   ├── (auth)/               #   Route group: shared shell for signed-out pages
│   │   ├── layout.tsx        #   Split-screen shell (form column + showcase)
│   │   ├── admin/login/      #   /admin/login
│   │   └── cashier/login/    #   /cashier/login
│   ├── cashier/pos/          #   /cashier/pos — till landing (placeholder)
│   └── api/auth/             #   BFF endpoints: [portal]/login, logout
├── modules/                  # Feature modules — self-contained
│   ├── auth/
│   │   ├── components/       #   UI specific to authentication
│   │   ├── constants/        #   Portal definitions, showcase copy
│   │   ├── schemas/          #   Zod validation, shared by client and server
│   │   ├── services/         #   auth.client.ts (browser) / auth.server.ts (BFF)
│   │   └── types/            #   Backend contract types
│   └── pos/                  #   Cashier till
│       ├── components/       #     Terminal, catalogue, order panel
│       ├── constants/        #     Placeholder catalogue
│       ├── lib/              #     Order arithmetic and cart state
│       └── types/            #     Till view model
└── shared/                   # Cross-module building blocks only
    ├── components/ui/        #   Button, TextField, PasswordField, Checkbox, Alert
    ├── components/brand/     #   Logo
    ├── config/               #   App metadata, routes, cookie policy
    └── lib/                  #   env validation, cn(), error mapping, rate limiting
```

**Module rule:** a feature module may import from `shared/`, never from another
feature module. Anything two modules both need is promoted to `shared/`.

## Getting started

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local     # then fill in API_BASE_URL
npm run dev                    # http://localhost:3000
```

`/` redirects to `/admin/login`.

### Backend

Spring Boot 3.5 on Java 21 with MongoDB, in `backend/`. See
[backend/README.md](backend/README.md) for how to run it, the endpoint table,
and the reasoning behind the storage and concurrency decisions.

```bash
cd backend
cp .env.example .env          # fill in MONGODB_URI
mvn spring-boot:run           # docs at /swagger-ui.html
```

The two rules that govern the money endpoints are worth knowing before reading
any of it. The server prices every basket — a checkout request carries product
ids and quantities and no amounts at all, because a total posted by a browser is
a number the customer can edit. And stock only ever moves through a single
atomic conditional update, so two tills cannot sell the same last bag of cement.

### Signing in

Two roles, because the shop has two jobs. **Admin** is the owner and his son,
with identical privileges. **Cashier** is whoever is on the counter: they reach
the till and nothing else.

The two admin accounts are created on a fresh database from environment
variables; leave the passwords blank and a strong one is generated and printed
once at first startup. Cashiers are created by an admin from the Staff screen,
who then hands the credentials over directly — there is no invitation email.

An admin who forgets their password recovers it themselves: **Forgot Password?**
on the admin sign-in page mails a single-use link that expires in
three-quarters of an hour. With no SMTP settings configured the service prints
the link to its log rather than failing, so the flow works on a development
machine and a locked-out owner can still be helped by hand. See
[backend/README.md](backend/README.md) for the rules that make an open reset
endpoint safe.

An admin can also sign in at the till, so the owner can cover the counter
without a second account.

## Routes

URLs come from one table, `frontend/src/shared/config/app.config.ts`; nothing
hard-codes a path string.

| URL                 | Route group | File                                        | State |
| ------------------- | ----------- | ------------------------------------------- | ----- |
| `/`                 | —           | `app/page.tsx`                              | Redirects to `/admin/login` |
| `/admin/login`      | `(auth)`    | `app/(auth)/admin/login/page.tsx`           | Built |
| `/cashier/login`    | `(auth)`    | `app/(auth)/cashier/login/page.tsx`         | Built |
| `/admin/dashboard`  | `(portal)`  | `app/(portal)/admin/dashboard/page.tsx`     | Built |
| `/admin/inventory`  | `(portal)`  | `app/(portal)/admin/inventory/page.tsx`     | Built |
| `/admin/inventory/new` | `(portal)` | `app/(portal)/admin/inventory/new/page.tsx` | Placeholder |
| `/admin/inventory/categories` | `(portal)` | `app/(portal)/admin/inventory/categories/page.tsx` | Placeholder |
| `/admin/reports`    | `(portal)`  | `app/(portal)/admin/reports/page.tsx`       | Built |
| `/admin/reports/generate` | `(portal)` | `app/(portal)/admin/reports/generate/page.tsx` | Placeholder |
| `/admin/reports/daily` | `(portal)` | `app/(portal)/admin/reports/daily/page.tsx` | Placeholder |
| `/admin/staff`      | `(portal)`  | `app/(portal)/admin/staff/page.tsx`         | Built |
| `/admin/settings`   | `(portal)`  | `app/(portal)/admin/settings/page.tsx`      | Built — Shop Profile |
| `/admin/settings/business-logic` | `(portal)` | `app/(portal)/admin/settings/business-logic/page.tsx` | Built |
| `/admin/settings/receipts` | `(portal)` | `app/(portal)/admin/settings/receipts/page.tsx` | Built |
| `/admin/settings/security` | `(portal)` | `app/(portal)/admin/settings/security/page.tsx` | Built |
| `/cashier/pos`      | —           | `app/cashier/pos/page.tsx`                  | Built |
| `/api/auth/{portal}/login` | —    | `app/api/auth/[portal]/login/route.ts`      | BFF endpoint (both portals) |
| `/api/auth/logout`  | —           | `app/api/auth/logout/route.ts`              | BFF endpoint |

Route groups are folder-only conventions and never appear in a URL. `(auth)`
carries the split-screen sign-in shell and is shared by both portals'
sign-in pages; `(portal)` carries the sidebar shell. `/cashier/pos` sits in
neither, because the admin navigation rail is not the cashier's chrome.

Placeholder pages exist so every navigation target leads somewhere and says
plainly that the screen is still to come, rather than dead-ending on a 404 that
looks like a bug. The same reasoning covers the inventory header buttons: they
route to real placeholder screens instead of rendering as controls that do
nothing when clicked. Delete each as its real design lands.

Nested routes keep their parent section highlighted in the sidebar, so
`/admin/inventory/new` still shows Inventory as current.

**How the portal is guarded.** Two layers doing different jobs. `middleware.ts`
checks only that a session cookie exists and redirects to the right sign-in page
if not — it cannot verify a token without a network call on every navigation,
and it is not trying to. What it buys is that a signed-out visitor lands on the
sign-in page immediately rather than watching a portal shell render and vanish.

The check that actually holds is `requireAdmin()` in the `(portal)` layout,
which asks the backend who the token belongs to. A forged or expired cookie
stops there. Doing it in the layout rather than each page means a screen added
later is protected by default. A signed-in cashier who opens a portal URL is
sent to the till, not to a login form they would pass and be rejected from
again.

## Data

Every screen reads from the Spring Boot API. Server Components fetch on the
server so pages arrive with their data in them, and mutations go through Server
Actions rather than hand-written BFF routes — the session token is in an
httpOnly cookie the browser cannot read, so the call has to happen server-side
anyway.

`shared/lib/api.server.ts` is the single way this app reaches the backend. Its
`server-only` import breaks the build if a Client Component imports it, which is
what keeps the session token out of the browser bundle.

What remains as illustrative data:

| Module | Feeds |
| ------ | ----- |
| `modules/dashboard/constants/dashboard-data.ts` | Dashboard stats, low stock, activity |
| `modules/inventory/constants/inventory-data.ts` | Inventory stats, products, paging |
| `modules/reports/constants/reports-data.ts` | Report stats, sales trend, categories, top products, daily rows |
| `modules/staff/constants/staff-data.ts` | The staff record shown on the staff screen |
| `modules/settings/constants/settings-data.ts` | Stored configuration for all four settings sections |
| `modules/pos/constants/pos-data.ts` | The terminal name only — the catalogue is live |

Every widget already takes its rows as props, so swapping in live calls is a
change to each page's data source rather than a rewrite.

**What actually works today:** inventory search, status filtering and CSV export
all run client-side over the loaded rows. That is real behaviour, but it is not
catalogue-wide — once the endpoint accepts `q` and `page`, the query belongs on
the server so it spans all entries.

**What does not:** pagination cannot work until the server accepts a page
parameter, so every target except the current page is genuinely disabled rather
than rendered as a live control that does nothing. The staff quick-add form
validates fully but reports plainly that it cannot save.

**The reports design puts the page title in the top bar**, where the dashboard
and inventory designs leave the bar empty and title the page body. The shared
chrome was kept consistent across all three screens and the title rendered in
the body; say if the top-bar title should become the global pattern instead.

**Currency still needs settling.** The supplied designs disagree — inventory
and reports use `$`, the dashboard uses `Rs.`. Settings now has the control that
should own this choice, but the screens still read the static
`appConfig.currencySymbol`, and the dashboard's figures remain literal strings
in its placeholder data. Once settings are persisted, every screen should read
the stored value.

## Staff

The shop runs with a single cashier, so `/admin/staff` manages one person
rather than a directory: no list, no search, no pagination. The record is a
single-entry array, and the type is written for a list so a second employee
later means adding a row plus a list view — not reworking the components.

The screen pairs a read-only summary with the controls that change it, so the
current values stay visible while they are being edited.

**The password reset is a separate card with its own submit button**, not a
field in the profile form. Changing a credential is a different kind of act
from correcting a phone number, and separating them means it cannot happen by
accident while editing something else. When the endpoint is built it must
require the signed-in administrator's own credentials before it will act.

## Portal chrome

Who is signed in lives in the **top bar's account control**: the avatar opens a
popover with the administrator's name, role, username, email and access level,
plus a link to settings. It is a plain popover rather than `role="menu"` —
most of what it shows is static detail, and announcing static text as menu
items misrepresents it to a screen reader. Escape closes it and returns focus
to the avatar; so does clicking outside or navigating.

The avatar falls back to initials, which is the normal case rather than an
error state. To use a real photograph, drop it under `public/images/admin/` and
point `avatarUrl` in `modules/auth/constants/placeholder-session.ts` at it. It
is left null deliberately: a stock portrait standing in for a real person is
worse than initials on client work.

The navigation rail ends with **Log out**, and it is real — it posts to
`/api/auth/logout`, which expires the httpOnly cookies server-side. A
client-only sign-out is not possible: the browser cannot clear an httpOnly
cookie, only the server that set it can.

**If that request fails the user is kept where they are, with an error**, rather
than sent to the sign-in screen. Navigating away from a session that is still
valid would look like a sign-out without being one — the worst outcome on a
shared shop-floor machine.

## Settings

Each of the four sections is a **real route**, not client-side tab state, so a
section can be linked to, bookmarked and reached with the browser's back
button — and a future "you have unsaved changes" guard has a navigation event
to hook into. `app/(portal)/admin/settings/layout.tsx` holds the heading, the
section nav and the single save button; the four pages supply only their panel.

**One "Save Changes" button lives in the page header, outside the form it
submits.** That is what the HTML `form` attribute is for: every section form
carries the same id and the button targets it, so the header is genuinely
shared across all four sections with no cross-component state. Verified: the
header button submits whichever section is currently showing.

Two things to hand to whoever wires the backend:

- **The security values are not controls until the API enforces them.** A
  session timeout the browser respects but the API ignores is decoration — the
  token's own expiry ends a session, and the lockout count has to be kept
  server-side where an attacker cannot skip past it. The minimum password
  length is floored at 8 in the schema so this screen cannot undercut the rule
  the sign-in and staff forms already apply.
- **The logo upload accepts SVG, which is a script-bearing document.** It must
  be sanitised server-side, or served from a separate origin under a strict CSP,
  before it is ever rendered back into the admin portal — otherwise a logo
  upload becomes a stored-XSS vector. The type and size checks in the browser
  are convenience only and are trivially bypassed.

## Charts

The two charts on the reports screen are hand-rolled inline SVG — a line, an
area and an arc are less code than a charting library would add to the bundle,
and it keeps the rendered markup something we control for accessibility.

Decisions worth knowing about:

- **The categorical palette is validated, not chosen by eye.** The three chart
  colours in `globals.css` clear colour-blind and normal-vision separation
  thresholds against the light chart surface. **They are assigned in fixed slot
  order and must not be re-sorted** — the ordering is the safety mechanism.
- **One slot sits below 3:1 contrast on white**, which obliges every chart using
  it to print visible labels rather than relying on colour. That is why the
  donut ships a legend with percentages rather than swatches alone.
- **The trend line uses monotone cubic smoothing**, not a plain spline. An
  ordinary spline overshoots between points and would draw a revenue peak higher
  than any day actually earned; the monotone variant cannot exceed the values it
  joins, so the smoothing stays cosmetic rather than misleading.
- **Tooltips enhance, never gate.** Every value the chart crosshair reveals is
  also printed in the Daily Summary table on the same page.
- **Bars are scaled against the highest seller**, so length and printed figure
  always agree. The supplied design had them disagree — a 450-unit line drawn
  shorter than a 142-unit one — which was corrected rather than reproduced.

## Two sign-in portals

There are two doors into the system, and they are separate URLs rather than a
role picker on one page — a shop-floor terminal can be bookmarked straight to
the till, and the two portals stay separable if that machine is later locked
down.

| Portal    | Sign in at      | Lands on        | Password reset |
| --------- | --------------- | --------------- | -------------- |
| Admin     | `/admin/login`  | `/admin/dashboard` | Self-service link |
| Cashier   | `/cashier/login`| `/cashier/pos`  | By an administrator |

Everything that differs between them is data, in
`modules/auth/constants/portals.ts`: heading copy, the username placeholder,
where a success lands, and whether recovery is offered. Both screens render
from one `LoginForm` and post to one hardened endpoint, so throttling, cookie
attributes and error shaping cannot drift between two near-identical copies.

**The portal id is not a permission.** It appears in the BFF's URL
(`/api/auth/{portal}/login`), where it is narrowed to a known portal and then
used only to choose the matching role-scoped backend endpoint. It rides in the
URL rather than the request body so the handler can identify and throttle an
attempt *before* it reads the body — an unthrottled client should never make
the route buffer a payload. A user changing the portal in the browser changes
which door they knock on, never whether it opens: the Spring Boot service
remains the sole authority.

## Point of sale

`/cashier/pos` is the till, and the only screen a cashier has. Products are
found by typing or by tapping a card. **There is no barcode scanner** — the shop
does not have one, so nothing in the till assumes a code can be read off a
label faster than it can be typed.

**Keyboard.** A full sale can be rung up without leaving the keyboard. The
search field is autofocused on load and refocused by **F2** from anywhere. Enter
adds an exact shelf-code match straight away; failing that, a search narrowed to
exactly one product is added too, because it is unambiguous. Anything broader is
left showing in the grid rather than guessed at. **F9** selects cash, **F10**
takes the payment, and Escape clears a mistyped search. Focus returns to the
search box after a card is tapped and after a sale completes, so typing always
works.

**Every lookup answers.** A status row under the search box says what happened —
added, out of stock, all of them already on the order, or nothing matched.
Text that matched nothing is left in the box to be corrected; anything else
clears it for the next product. The row is always present rather than appearing
and vanishing, because the cashier taps cards directly below it and a grid that
jumps is a mis-tap.

**Cash and change.** For a cash sale the summary offers the exact amount plus
the three round figures a customer is most likely to hand over for that
particular bill, a box to type anything else, and the change in the largest type
in the panel. Leaving it blank means the customer paid exactly, which is what
the backend records. The amount tendered is sent to the server, which computes
the change that is stored and printed — the till only previews it.

**Stock is a hard limit.** The till will not add a sold-out product and will not
step a line past the units on hand — the `+` button disables itself and the row
says why, and the product card dims once the order is holding all of it. Selling
stock that is not there is the one mistake a till must not make: it turns into a
customer waiting at the counter for something nobody has. Sold-out products stay
visible but disabled rather than being filtered out, so a cashier looking for
one can see that it exists and that there is none.

**The totals on screen are for display only.** `modules/pos/lib/cart.ts` rounds
to whole cents at every step so the subtotal, discount and total always
reconcile, but the figure that is charged, printed and posted to the ledger must
be recomputed by the Spring Boot service from the line items it receives. A
browser is not a trustworthy calculator, and this is money.

**Payment is not connected.** Pressing *Pay & Print Receipt* says so plainly and
leaves the order untouched. A till that appears to take money it has not
recorded is the most damaging thing this screen could pretend to do; that notice
is the placeholder for the real `POST /api/v1/pos/sales` call and receipt
hand-off.

The commit action is orange (`--color-pay`) rather than brand blue on purpose:
blue marks the tender the cashier has *selected*, and orange marks the
irreversible act of charging for it. Keeping the two apart is what stops a
hurried cashier reading "choose card" and "take the money" as the same control.

### Layout

**The two columns start at `md` (768px), not `lg`.** A tablet held in portrait is
the likeliest thing this runs on and 768px is exactly an iPad, so hiding the
order behind an overlay there was the wrong trade.

**Nothing is sized by a breakpoint that cannot see what it is sizing.** Two
rules do the work:

- The order panel is `clamp(20rem, 40%, 32rem)` — the design's 40% share through
  the middle of the range, never under 320px on a small tablet, and capped at
  512px on a wide monitor, where the extra room is better spent on product cards
  than on a wider total.
- The product grid is `repeat(auto-fill, minmax(10rem, 1fr))`, so it fits as
  many cards as the *remaining* space allows. Viewport breakpoints could not see
  how much the panel was taking and got it wrong at both ends: 282px cards at
  600px wide, and still only four columns on a 1920px screen.

**Inside the panel, layout comes from container queries**, because the same
screen hands it anywhere from 320px to 512px depending on the window. Below
28rem the order rows stack — name on one line, stepper and money on the next —
which keeps the product name readable instead of truncating it to "Cemex
Portla…". The three-column row the design draws needs a fixed 280px for its Qty
and Price tracks, so 448px is the first panel width that leaves the name a
usable ~160px.

The shell pins itself to one viewport so **the page never scrolls** and the pay
button never moves; only the grid and the order lines scroll, inside themselves.
The pin is guarded by `(min-width: 48rem) and (min-height: 40rem)` — `md:h-dvh`
alone would also catch a phone in landscape, where a fixed height puts the order
summary off the bottom of the screen with no way to reach it.

Below `md` the order panel is a sheet over the grid, reached from a summary bar
pinned to the bottom. It closes on Escape, locks the page behind it, takes focus
on open and hands it back on close, and is announced as a dialog only while it
is actually a dialog. The brand lockup shortens to "Ranmini" so the terminal
number still fits beside it.

Measured in a real browser at 14 viewports from 320x568 to 1920x1080:

| Viewport | Columns | Order panel | Page scroll |
| -------- | ------- | ----------- | ----------- |
| 320x568  | 2 | Sheet | scrolls (below `md`) |
| 390x844  | 2 | Sheet | scrolls (below `md`) |
| 600x900  | 3 | Sheet | scrolls (below `md`) |
| 768x1024 | 2 | 320px | **0** |
| 1024x768 | 3 | 410px | **0** |
| 1280x800 | 4 | 512px | **0** |
| 1536x864 | 5 | 512px | **0** |
| 1920x1080| 8 | 512px | **0** |

No horizontal overflow at any width. Card widths stay within 142–224px across
the whole range; before this they swung from 142px to 343px.

### Touch

The till is assumed to be a touch screen. Every control carries
`touch-manipulation`, which drops the browser's double-tap-to-zoom wait — on a
counter that delay reads as a tap that did not land, and the cashier taps
again. Presses
give physical feedback (cards and buttons scale slightly), scroll regions use
`overscroll-contain` so a flick at the end of the grid does not drag the page,
and the bottom bar respects `env(safe-area-inset-bottom)` for the home indicator
on a modern phone.

## Backend contract — authentication

The sign-in flow expects one endpoint per portal:

`POST {API_BASE_URL}/api/v1/auth/admin/login`
`POST {API_BASE_URL}/api/v1/auth/cashier/login`

Request (identical for both — the role is expressed by the URL, and neither
`portal` nor `rememberMe` is forwarded):

```json
{ "username": "olitharanasinghe2003", "password": "..." }
```

Success — `200 OK`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "expiresIn": 900,
  "user": {
    "id": "665f...",
    "username": "olitharanasinghe2003",
    "fullName": "Olitha Ranasinghe",
    "email": "admin@ranminihardware.lk",
    "role": "ADMIN"
  }
}
```

Failure — return `401` for bad credentials, `403` for a locked account, `429`
when throttled. Do **not** distinguish "unknown user" from "wrong password" in
the status or body: the frontend maps `400`, `401` and `404` to one generic
message precisely so the endpoint cannot be used to enumerate usernames.

**Each endpoint must reject the other role's credentials with `401`.** Issuing a
token for a cashier on the admin endpoint would defeat the split described
above — the frontend cannot enforce this and does not try to.

## Security practices

These are enforced in code, not just by convention:

- **No secrets in the repository.** `.env*` is git-ignored except `.env.example`.
  Configuration is validated at runtime by `shared/lib/env.ts`.
- **No secrets in the browser bundle.** Server-only variables have no
  `NEXT_PUBLIC_` prefix, and `env.ts` imports `server-only` so a leak into a
  Client Component breaks the build rather than shipping quietly.
- **Session tokens are `httpOnly`, `Secure`, `SameSite=Strict`** and carry the
  `__Host-` prefix in production. An XSS payload cannot read them.
- **Input is validated on both sides** with the same Zod schema. The server
  never trusts the client's copy.
- **Errors are mapped, not echoed.** Backend failures become vetted user-facing
  copy; the raw reason is logged server-side only.
- **Login is rate limited** per client *and per portal* at the BFF, so a
  cashier fumbling their password at a till cannot lock the owner out of the
  management portal from the same shop IP. The authoritative limit still has to
  be added in Spring Boot — see `shared/lib/rate-limit.ts`.
- **Portal separation is enforced server-side.** The browser names a portal;
  the BFF maps it to a role-scoped backend endpoint through a closed lookup, so
  no client-supplied text ever reaches the backend URL.
- **Security response headers** — CSP, HSTS, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy` — are set in
  `next.config.ts`, and `X-Powered-By` is suppressed.

## Responsive behaviour

One layout across all sizes, measured in a real browser at 14 viewports from
320x568 to 1920x1080. No horizontal overflow at any width.

### Width

| Range       | Layout                                                            |
| ----------- | ----------------------------------------------------------------- |
| `< 1024px`  | Single column. The showcase panel is dropped entirely — a decorative photograph is not worth the bandwidth or vertical space on a phone. The form centres itself in the viewport rather than clinging to the left edge. |
| `>= 1024px` | Two columns, 40 / 60. Gutters ease off between `lg` and `xl` so the footer stays on one line in the narrow 1024px form column. |
| `>= 1280px` | Full gutters; matches the reference design's 320px form column.    |

### Height

From `lg` the shell is pinned to exactly one viewport (`h-dvh`), so **a desktop
or laptop never scrolls the page**. The header sits at the top, the footer at the
bottom, and the form absorbs the slack between them. Verified at `pageScroll = 0`
for 1024x768, 1280x720, 1280x800, 1366x768, 1440x900, 1600x900 and 1920x1080.

The escape hatch matters as much as the rule. On a genuinely short window — a
1280x600 browser, or a laptop with OS zoom turned up — the form can need more
height than exists. Rather than clip it, the form column alone gets an
`overflow-y-auto` scrollbar while the page and the photograph stay put. It only
engages when the alternative would be an unreachable Sign In button.

Below `lg` the viewport height is a *minimum*, not a cap, and the page scrolls
normally — a phone keyboard can take half the screen, and locking the viewport
there would trap the user. Spacing tightens below `sm`, which costs nothing on
roomy screens (the form is centred either way) and is what lets 360x640 fit with
no scroll at all. Only 320x568 scrolls, and even there the Sign In button stays
above the fold; just the footer falls below it.

Touch targets (the password reveal toggle, the carousel dots) are sized for
fingers, and the carousel stops auto-advancing when the OS reports
`prefers-reduced-motion`.

## Local development note

`next dev` and `next build` share the `.next` directory. Running a build while a
dev server is up corrupts it and the dev server starts returning 500s. If that
happens: stop both, delete `.next`, and start again.

## Assets

Photographs live in two folders, each with its own README recording every
photo's Unsplash ID and photographer so the originals can be re-cropped later,
plus the guidelines to follow when swapping one out. All are under the Unsplash
License — free commercial use, no attribution required.

| Folder | Used by | Fallback if a file is missing |
| ------ | ------- | ----------------------------- |
| `public/images/auth/` | The sign-in showcase panel | The brand gradient |
| `public/images/products/` | Product cards on the till | A neutral tile with a package icon |

The product images are **stand-ins and should be replaced with photographs of
the shop's actual stock** before the till goes live — a point-of-sale grid is
scanned by picture as much as by name. Neither folder may contain third-party
brand logos: two otherwise good cement photographs were rejected for showing a
competitor's bags, which is why that one card currently carries an unbranded
material texture rather than a product shot.

## Currency

The symbol is a shop setting (Settings → Business Logic), and
`appConfig.currencySymbol` is the build-time default the portal renders until
that setting is loaded from the backend. The two must be kept in step.

The supplied designs disagreed — the inventory screen used "$" while the
dashboard, the till and the business-logic default all used the rupee — so it is
settled as the rupee and driven from one place rather than hard-coded per
screen. Note that the till's design shows "Rs" without the full stop while the
rest of the app uses "Rs."; the configured value wins, so the till renders
"Rs. 2,450.00". Change the setting if the client wants the other form.

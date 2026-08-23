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
│   │   └── admin/login/      #   /admin/login
│   └── api/auth/             #   BFF endpoints: login, logout
├── modules/                  # Feature modules — self-contained
│   └── auth/
│       ├── components/       #   UI specific to authentication
│       ├── constants/        #   Editable content (showcase copy)
│       ├── schemas/          #   Zod validation, shared by client and server
│       ├── services/         #   auth.client.ts (browser) / auth.server.ts (BFF)
│       └── types/            #   Backend contract types
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

Not yet scaffolded. The frontend expects a Spring Boot service at `API_BASE_URL`.

## Routes

URLs come from one table, `frontend/src/shared/config/app.config.ts`; nothing
hard-codes a path string.

| URL                 | Route group | File                                        | State |
| ------------------- | ----------- | ------------------------------------------- | ----- |
| `/`                 | —           | `app/page.tsx`                              | Redirects to `/admin/login` |
| `/admin/login`      | `(auth)`    | `app/(auth)/admin/login/page.tsx`           | Built |
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
| `/api/auth/login`   | —           | `app/api/auth/login/route.ts`               | BFF endpoint |
| `/api/auth/logout`  | —           | `app/api/auth/logout/route.ts`              | BFF endpoint |

Route groups are folder-only conventions and never appear in a URL. `(auth)`
carries the split-screen sign-in shell; `(portal)` carries the sidebar shell.
Both live under the same `/admin/*` space.

Placeholder pages exist so every navigation target leads somewhere and says
plainly that the screen is still to come, rather than dead-ending on a 404 that
looks like a bug. The same reasoning covers the inventory header buttons: they
route to real placeholder screens instead of rendering as controls that do
nothing when clicked. Delete each as its real design lands.

Nested routes keep their parent section highlighted in the sidebar, so
`/admin/inventory/new` still shows Inventory as current.

**Not yet implemented:** nothing guards the portal. Any visitor can open
`/admin/dashboard` without signing in. Add a middleware session check — the
`TODO(auth)` in `app/(portal)/layout.tsx` marks the spot — before this is
exposed to anyone.

## Placeholder data

No screen is wired to a backend yet. Every figure is illustrative and isolated
in a small number of clearly named modules, each naming the endpoint that should
replace it:

| Module | Feeds |
| ------ | ----- |
| `modules/dashboard/constants/dashboard-data.ts` | Dashboard stats, low stock, activity |
| `modules/inventory/constants/inventory-data.ts` | Inventory stats, products, paging |
| `modules/reports/constants/reports-data.ts` | Report stats, sales trend, categories, top products, daily rows |
| `modules/staff/constants/staff-data.ts` | The staff record shown on the staff screen |
| `modules/settings/constants/settings-data.ts` | Stored configuration for all four settings sections |
| `modules/auth/constants/placeholder-session.ts` | The signed-in user in the portal chrome |

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

## Backend contract — authentication

The sign-in flow expects this endpoint to exist:

`POST {API_BASE_URL}/api/v1/auth/login`

Request:

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
- **Login is rate limited** per client at the BFF (with the authoritative limit
  still to be added in Spring Boot — see `shared/lib/rate-limit.ts`).
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

Sign-in showcase photographs live in `frontend/public/images/auth/` — three
Unsplash photographs under the Unsplash License (free commercial use, no
attribution required). The README there records each photo's ID and
photographer so the originals can be re-cropped later, plus the guidelines to
follow when swapping one out. If a file is ever missing the panel falls back to
a brand gradient, so the page never shows a broken image.

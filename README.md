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

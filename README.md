<div align="center">

# Ranmini Hardware — POS & Inventory

**Point of sale, inventory and reporting for Ranmini Hardware, Karadupona, Kegalle.**

A web application with two sides: a **till** for the cashier at the counter, and a
**management portal** for the owners.

<br />

![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.1-149ECA?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-JWT-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

</div>

---

## Tech stack

<table>
  <tr>
    <th align="left">Layer</th>
    <th align="left">Technology</th>
    <th align="left">What it does here</th>
  </tr>
  <tr>
    <td rowspan="6"><b>Frontend</b></td>
    <td>Next.js 15.5 (App Router) · React 19</td>
    <td>Server-rendered screens, Server Actions for every write, and a backend-for-frontend layer that keeps session tokens out of the browser</td>
  </tr>
  <tr>
    <td>TypeScript 5 (strict)</td>
    <td>End-to-end types, including the contract with the API</td>
  </tr>
  <tr>
    <td>Tailwind CSS 4</td>
    <td>Design tokens in <code>globals.css</code>, light and dark themes, container queries for the till</td>
  </tr>
  <tr>
    <td>React Hook Form · Zod 4</td>
    <td>Forms, and validation schemas shared by the browser and the server</td>
  </tr>
  <tr>
    <td>lucide-react</td>
    <td>Icons</td>
  </tr>
  <tr>
    <td>ESLint 9</td>
    <td>Linting with the Next.js ruleset</td>
  </tr>
  <tr>
    <td rowspan="7"><b>Backend</b></td>
    <td>Java 21 · Spring Boot 3.5</td>
    <td>REST API under <code>/api/v1</code>, on virtual threads</td>
  </tr>
  <tr>
    <td>Spring Security · JJWT 0.12</td>
    <td>Stateless JWT authentication, role-based access, BCrypt passwords</td>
  </tr>
  <tr>
    <td>Spring Data MongoDB</td>
    <td>Persistence, atomic stock updates, aggregation pipelines for reports</td>
  </tr>
  <tr>
    <td>Spring Cache · Caffeine</td>
    <td>In-process cache for settings and categories</td>
  </tr>
  <tr>
    <td>OpenPDF 2.0</td>
    <td>Inventory stock sheets and sales reports, rendered server-side</td>
  </tr>
  <tr>
    <td>Spring Mail</td>
    <td>Password-reset emails (falls back to logging the link when no SMTP is set)</td>
  </tr>
  <tr>
    <td>springdoc-openapi 2.8</td>
    <td>Interactive API docs at <code>/swagger-ui.html</code></td>
  </tr>
  <tr>
    <td><b>Database</b></td>
    <td>MongoDB 7 (local or Atlas)</td>
    <td>Money stored as <code>Decimal128</code>; every index declared in code</td>
  </tr>
  <tr>
    <td rowspan="2"><b>Testing</b></td>
    <td>JUnit 5 · AssertJ · Mockito</td>
    <td>Unit tests</td>
  </tr>
  <tr>
    <td>Testcontainers 1.20</td>
    <td>Integration tests against a real, disposable MongoDB</td>
  </tr>
  <tr>
    <td><b>Tooling</b></td>
    <td>Maven · npm · Docker Compose</td>
    <td>Builds, and a throwaway local MongoDB</td>
  </tr>
</table>

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [How the business rules work](#how-the-business-rules-work)
- [Security](#security)
- [Performance and scale](#performance-and-scale)
- [Routes](#routes)
- [The till in detail](#the-till-in-detail)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Assets and licensing](#assets-and-licensing)

---

## What it does

The system has **two separate doors**, one for each job in the shop. They are
different URLs with different sign-in pages, and neither role can use the
other's.

| | **Management portal** | **Till** |
| --- | --- | --- |
| **Who** | The owner and his son (identical privileges) | Whoever is on the counter |
| **Sign in at** | `/admin/login` | `/cashier/login` |
| **Lands on** | `/admin/dashboard` | `/cashier/pos` |
| **Forgotten password** | Self-service email link | Reset by an owner |

### Management portal

- **Dashboard** — today's and this month's takings, transaction counts, low-stock
  lines, and a quick way to add a cashier.
- **Inventory** — the full catalogue with server-side search, status filters and
  pagination; add and edit products; record deliveries, stocktake corrections and
  breakage as stock movements; manage categories; export a PDF stock sheet.
- **Reports** — revenue trend, category share, best sellers and a daily summary
  for any period; a per-day view of every transaction with receipt lookup and
  voiding; PDF export.
- **Staff** — create cashiers and owners, reset passwords, deactivate and restore
  accounts. Nobody is ever deleted, because every sale names who rang it up.
- **Settings** — shop profile and logo, tax rate and currency, receipt format,
  and security policy (session length, lockout threshold, minimum password
  length, audit log).
- **Notifications** — out-of-stock and low-stock lines, and sales voided in the
  last week.
- **Profile** — each owner's own name, picture and password.

### Till

- **Fast product lookup** by typing or tapping — built for a shop with no barcode
  scanner, and usable end to end from the keyboard.
- **Cash handling** with suggested tender amounts and the change shown large.
- **Receipt printing** straight from the completed sale.
- **Stock alerts** — a notification centre of its own, carrying only what a
  cashier can act on, plus an immediate warning when a sale takes a line to its
  reorder level.
- **Responsive from phone to wall-mounted monitor**, and tuned for touch.

---

## Architecture

A **modular monolith** deployed as a **client–server** pair.

```
┌─────────────────────────────┐        ┌─────────────────────────────┐        ┌───────────┐
│  frontend/  (Next.js)       │        │  backend/  (Spring Boot)    │        │  MongoDB  │
│                             │        │                             │        │           │
│  Browser ──► Server         │ HTTPS  │  REST API                   │        │           │
│              Components,    │ ─────► │  /api/v1/**                 │ ─────► │           │
│              Server Actions,│        │                             │        │           │
│              Route Handlers │        │  JWT · roles · validation   │        │           │
└─────────────────────────────┘        └─────────────────────────────┘        └───────────┘
        holds the session                    the only authority on
        in httpOnly cookies                  who may do what
```

**The browser never calls Spring Boot.** It talks only to the Next.js app, which
reads from the API on the server and keeps the session tokens in `httpOnly`
cookies that JavaScript cannot read. That keeps tokens out of reach of any
script on the page and lets the API sit on a private network.

**Both halves are organised by feature, not by file type.** On the backend each
module — `catalog`, `sales`, `staff`, `settings`, `reporting`, `notifications`,
`audit`, `auth` — has its own `domain`, `repository`, `service` and `web`
packages. Modules talk to each other only through a small `api` package, so, for
example, the sales module can take stock only through `CatalogApi` and can never
hold a raw product document.

On the frontend the same rule holds: a feature module may import from
`shared/`, never from another feature module. Anything two modules both need is
promoted to `shared/`.

---

## Getting started

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 20 or newer |
| Java | 21 |
| Maven | 3.9 or newer |
| MongoDB | 7 — a local install, Docker, or an Atlas cluster |
| Docker | Optional; only for the integration tests and a throwaway database |

### 1. Configure

```bash
cp .env.example .env
```

Then set **`RANMINI_AUTH_JWT_SECRET`** — the only value without a default. Any
string of 32 characters or more works for development; for anything real use:

```bash
openssl rand -base64 48
```

There is **one `.env` at the repository root** for both halves. It is
git-ignored; only `.env.example`, with every secret blank, is ever committed.

### 2. Start the backend

```bash
cd backend

# Option A — use the MongoDB in MONGODB_URI (defaults to localhost:27017)
mvn spring-boot:run

# Option B — start a throwaway MongoDB in Docker first
docker compose up -d
mvn spring-boot:run
```

The API runs at `http://localhost:8080`.

- API docs — `http://localhost:8080/swagger-ui.html`, after adding
  `API_DOCS_ENABLED=true` to `.env`. They are off by default and should stay off
  in production.
- Health — `http://localhost:8080/actuator/health`

To load a sample catalogue and ninety days of sales history into an **empty
development** database, add `-Dranmini.seed.enabled=true`. It refuses to run if
any product already exists, so it cannot touch a real shop's data.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000` and opens on the admin sign-in page.
Start the backend first — every screen reads from it.

### 4. Sign in

On a fresh database the two owner accounts (`owner` and `manager` by default)
are created at startup. If their passwords are blank in `.env`, **a strong one
is generated and printed to the backend log once, on that first run only** —
note it, then change it from the profile screen.

Cashiers are created by an owner from **Staff** in the portal, with a password
the owner chooses and hands over in person. If no active cashier exists, the
backend says so in its startup log, because otherwise the only symptom is a till
sign-in page that refuses everything.

---

## Configuration

Everything lives in the root `.env`. A real environment variable always takes
precedence over a line in the file, so a container or a service unit can supply
values with no file at all.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RANMINI_AUTH_JWT_SECRET` | *(none — required)* | Signs session tokens. The service will not start without it. |
| `MONGODB_URI` | `mongodb://localhost:27017/ranmini_pos` | Connection string, including the database name |
| `SERVER_PORT` | `8080` | API port |
| `API_BASE_URL` | `http://localhost:8080` | Where the frontend reaches the API |
| `API_TIMEOUT_MS` | `10000` | How long the frontend waits for the API |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Browser origins allowed to call the API |
| `RANMINI_AUTH_ACCESS_MINUTES` | `30` | Fallback session length; the shop's setting normally decides |
| `RANMINI_AUTH_REFRESH_DAYS` | `7` | Refresh token lifetime |
| `RANMINI_ADMIN_PRIMARY_*` | `owner` | Username, name, email and password of the first owner |
| `RANMINI_ADMIN_SECONDARY_*` | `manager` | The same for the second owner |
| `SPRING_MAIL_HOST` / `_PORT` / `_USERNAME` / `_PASSWORD` | *(unset)* | SMTP for reset emails. Unset means the link is logged instead. |
| `RANMINI_MAIL_FROM` | `no-reply@ranminihardware.lk` | Sender address on reset emails |
| `RANMINI_RESET_URL` | `http://localhost:3000/admin/reset-password` | Where the reset link points — must be the real public address once deployed |
| `RANMINI_AUTH_RESET_MINUTES` | `45` | How long a reset link stays valid |
| `APP_LOG_LEVEL` | `INFO` | Set to `DEBUG` to see every query |

**Only two of these reach the Next.js process** — `API_BASE_URL` and
`API_TIMEOUT_MS`. `frontend/next.config.ts` reads the root file and adopts
those two alone. The frontend has no use for the signing key, the database
credentials or the mail password, and a process that never holds a secret cannot
leak one.

> **Gmail:** the SMTP password must be a 16-character App Password, not the
> account password, and `RANMINI_MAIL_FROM` must be that same Gmail address.

---

## How the business rules work

These are the rules the rest of the system is built around. Each one exists
because the alternative loses the shop money or trust.

### Money

- **The server prices every basket.** A checkout sends product ids and
  quantities only — no amounts. Every figure is recomputed from the catalogue and
  the shop's settings, because a total posted by a browser is a number a customer
  could edit. The total the cashier watches is a preview.
- **Discount first, then tax** on the discounted amount. The other order
  overcharges.
- **Profit excludes tax**, which is collected on behalf of the state.
- **Cost is frozen onto the receipt** at the moment of sale, so a price change
  next month cannot rewrite this month's margin.
- **Money is `Decimal128`**, never a floating-point number, so it sums exactly
  in the database.

### Stock

- **Stock moves only through one atomic, conditional update.** Two tills cannot
  both sell the last bag of cement.
- **A line sells right down to zero**, and only then is a sale refused. Being low
  is something the shop is told about, never something that stops a customer
  being served.
- **A failed sale puts back what it took.** If line four has no stock, lines one
  to three are returned before the error is shown.
- **Every movement is written to a stock ledger** — sales, voids, deliveries,
  stocktake corrections, breakage — so the count can always be explained.
- **A delivery recorded with its cost reprices at weighted average.** 40 bags
  at Rs. 1,900 plus 60 delivered at Rs. 2,000 become 100 bags at Rs. 1,960.
  Breakage and corrections never change the cost of what is left.
- **Stock cannot be typed over.** Editing a product never changes its count;
  a correction is a movement with a reason.

### Receipts and sales

- **Invoice numbers are sequential and gap-free** — for example
  `INV-20260831-0042` — from an atomic counter per trading day.
- **Checkout is idempotent.** The till sends a key with each basket, so pressing
  Pay again after a network timeout returns the original sale instead of
  charging twice.
- **Sales are voided, never deleted.** A void returns the stock, reverses the
  day's totals and records a reason. Voiding twice is refused.
- **The cashier on a receipt comes from their session**, never from the request.
- **Trading days follow Colombo time**, so a sale at 23:50 is filed under that
  day, not under whatever date it is in UTC.

### Reporting

- **Anything by day reads a pre-aggregated summary**, updated atomically as each
  sale lands. A month's chart reads thirty small documents whether the shop made
  thirty sales or thirty thousand.
- **Breakdowns by product or category** aggregate raw sales over a bounded range
  of at most a year, always on an indexed slice.
- **The average sale is per trading day**, so a day the shop was closed does not
  drag it down.

### Notifications

- **Derived, not stored.** Every row is computed from current state when the
  panel opens, so restocking a product makes its warning disappear on its own.
- **The owner's feed** carries out-of-stock lines, low-stock lines and recent
  voids.
- **The cashier's feed** carries stock only. Voids are the owner's oversight of
  the counter, which makes them the wrong thing to show at the counter.
- **The till warns on the crossing, not the state.** A sale that takes a line
  from six to five warns; the next sale, from five to four, does not. Warning on
  every sale of a low line would put a banner on every transaction, and a banner
  on every transaction is one nobody reads.

---

## Security

Enforced in code, not left to convention.

| Area | What is done |
| --- | --- |
| **Secrets** | Never in the repository. `.env*` is git-ignored except the blank template, and the frontend is given only the two non-secret values it needs. |
| **Sessions** | JWTs in `httpOnly`, `SameSite=Strict` cookies, `Secure` and `__Host-`-prefixed in production. No script on the page can read them. |
| **Two separate sessions** | Each portal has its own cookies, so signing in at one door never replaces the other's session. Every server-side call names which session it uses, and the compiler enforces it. |
| **Authorisation** | Deny by default. The backend decides every request by role; the frontend guards exist only to redirect people to the right screen. |
| **Page data** | Every server-side read is paired with its guard (`adminFetch`, `cashierFetch`), so a page is protected because it asks for protected data — not because someone remembered. |
| **Passwords** | BCrypt. Minimum length is a shop setting that can never go below 8. |
| **Brute force** | Accounts lock after a configurable number of failures; sign-in is also throttled per client and per portal. |
| **Username privacy** | Unknown user, wrong password and wrong portal all look identical, including in response time. |
| **Password reset** | Single-use, short-lived, stored only as a hash, and never reveals whether an address belongs to an account. |
| **Uploads** | Checked against an allowlist by their actual bytes, not their name. SVG is refused, because it can carry script. |
| **Customer-facing data** | The till's product data has no buying price in it at all, so a margin can never reach a screen a customer can see. |
| **Headers** | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` are set; `X-Powered-By` is removed. |
| **Errors** | Mapped to safe user-facing messages. Stack traces and internal details never leave the server. |
| **Audit log** | Sensitive actions are recorded with the actor taken from their verified session, so an entry cannot name the wrong person. |

---

## Performance and scale

The system is designed so that **the cost of a screen does not grow with the age
of the business.**

- **Every query has an index**, declared in
  [`MongoIndexInitializer`](backend/src/main/java/lk/ranminihardware/pos/shared/config/MongoIndexInitializer.java)
  and created at startup. Automatic index creation is switched off, so a large
  collection never gets a surprise index build in the middle of a trading day.
- **Reports read pre-aggregated daily totals** rather than scanning sales.
- **Every list is paged and capped** at 200 rows per request, so no request can
  turn into a full collection scan.
- **Old records expire themselves.** The stock ledger and the audit log are
  kept for two years; used password-reset links remove themselves.
- **Hot settings are cached** in memory and invalidated on every change.

### How much data can it hold?

Tens of thousands of records is **small** for MongoDB. At 30,000 sales the whole
database is well under 100 MB of text. Size is not where a slowdown would come
from. In practice, three things matter far more:

1. **Distance to the database.** Choose an Atlas region close to Sri Lanka —
   **Mumbai (ap-south-1)** or **Singapore (ap-southeast-1)**. A distant region
   adds a quarter of a second to every query, and a page runs several.
2. **The shop's internet connection.** A cloud-hosted till cannot sell while the
   line is down. For a single shop, running MongoDB on the counter machine with a
   cloud backup is worth considering.
3. **The Atlas tier.** The free M0 tier has **no backups** and shares its CPU.
   For a live sales ledger, use at least M2/M5, which include backups.

---

## Routes

Every URL comes from one table in
[`app.config.ts`](frontend/src/shared/config/app.config.ts); nothing hard-codes a
path.

| URL | Screen |
| --- | --- |
| `/` | Redirects to `/admin/login` |
| `/admin/login` | Owner sign-in |
| `/admin/forgot-password` · `/admin/reset-password` | Password recovery |
| `/cashier/login` | Cashier sign-in |
| `/admin/dashboard` | Dashboard |
| `/admin/inventory` | Catalogue |
| `/admin/inventory/new` · `/admin/inventory/[id]/edit` | Add and edit a product |
| `/admin/inventory/categories` | Categories |
| `/admin/reports` · `/admin/reports/daily` | Reports and daily details |
| `/admin/staff` | Staff accounts |
| `/admin/profile` | The signed-in owner's account |
| `/admin/settings` (+ `/business-logic`, `/receipts`, `/security`) | Settings |
| `/cashier/pos` | The till |

The `/api/*` routes in the frontend are not pages. They exist because the browser
cannot call the backend itself: sign-in and sign-out per portal
(`/api/auth/{portal}/login`, `/api/auth/{portal}/logout`), image proxies for
product photos, avatars and the shop logo, and the two PDF downloads.

---

## The till in detail

The till is the screen that matters most, and it has had the most care.

**Keyboard.** A whole sale can be rung up without touching the mouse. The search
box is focused on load and reached with **F2** from anywhere. **Enter** adds an
exact shelf-code match at once, or the only product left after a search.
**F9** selects cash, **F10** takes the payment, and **Escape** clears a search.
Focus returns to the search box after every add and every sale.

**Every lookup answers.** A status line always says what happened — added, out of
stock, all of it already in the basket, or nothing matched. Text that matched
nothing stays in the box to be corrected.

**Stock is a hard limit.** A sold-out product stays visible but disabled, so a
cashier can see it exists and that there is none. The `+` button stops at the
units on hand.

**Cash.** The summary offers the exact amount plus the three round figures a
customer is most likely to hand over for that bill, and shows the change in the
largest type on screen. The server computes the change that is recorded; the till
only previews it.

**Payment confirmation** covers the screen, shows the change due first, lists what
was sold, and never dismisses itself — a cashier counting notes out of the drawer
must not have the figure vanish mid-count. **Enter** closes it; **P** prints
another copy.

**The pay button is orange** while the selected tender is blue, so "choose card"
and "take the money" can never be mistaken for the same control.

### Layout

The two-column layout starts at **768 px**, because a portrait iPad is the most
likely device. The order panel is sized with `clamp()` and the product grid with
`auto-fill`, so both respond to the space actually available rather than to the
window width. Inside the panel, **container queries** decide the row layout.

On laptops and desktops the till fits the screen exactly — **the page never
scrolls** and the pay button never moves; only the product grid and the order
lines scroll inside themselves. Below 768 px the order becomes a sheet reached
from a bar at the bottom.

Measured in a real browser:

| Viewport | Product columns | Order panel | Page scroll |
| --- | --- | --- | --- |
| 320 × 568 | 2 | Sheet | Scrolls |
| 390 × 844 | 2 | Sheet | Scrolls |
| 768 × 1024 | 2 | 320 px | **None** |
| 1024 × 768 | 3 | 410 px | **None** |
| 1280 × 800 | 4 | 512 px | **None** |
| 1920 × 1080 | 8 | 512 px | **None** |

**Touch.** Every control removes the browser's double-tap delay, presses give
visible feedback, scroll areas do not drag the page, and the bottom bar respects
the safe area on modern phones.

---

## Testing

```bash
# Backend
cd backend
mvn test        # unit tests — no infrastructure needed
mvn verify      # plus integration tests — needs Docker running

# Frontend
cd frontend
npx tsc --noEmit
npm run lint
```

The integration tests run against a **real MongoDB** started by Testcontainers,
not a mock. The behaviour this system depends on most — an update that must be
atomic, an index that must reject a duplicate, an aggregation that must sum money
exactly — is precisely what an in-memory fake gets wrong.

`CheckoutServiceIT` covers the rules a till must never get wrong: the server
prices the basket, stock cannot be oversold even by twenty concurrent tills, a
retried checkout never charges twice, invoice numbers never repeat, a low line
sells down to zero, and the reorder warning fires once — on the crossing.

---

## Project structure

```
Ranmini-Hardware.io/
├── .env.example                  # The only committed config — every secret blank
├── backend/                      # Spring Boot API
│   ├── compose.yaml              #   Throwaway MongoDB for development
│   └── src/main/java/lk/ranminihardware/pos/
│       ├── auth/                 #   Sign-in, JWT, password reset
│       ├── catalog/              #   Products, categories, stock, PDF stock sheet
│       ├── sales/                #   Checkout, voids, daily totals
│       ├── reporting/            #   Analytics and the sales PDF
│       ├── dashboard/            #   The owner's landing figures
│       ├── notifications/        #   Owner and till feeds
│       ├── staff/                #   Accounts and profiles
│       ├── settings/             #   Shop configuration and logo
│       ├── audit/                #   The activity log
│       └── shared/               #   Config, errors, money, PDF, indexes, seeders
├── frontend/                     # Next.js app
│   └── src/
│       ├── app/                  #   Routing only — thin, delegates to modules
│       │   ├── (auth)/           #     Sign-in screens
│       │   ├── (portal)/admin/   #     Management portal
│       │   ├── cashier/pos/      #     The till
│       │   └── api/              #     Sign-in/out, image proxies, PDF downloads
│       ├── modules/              #   One folder per feature
│       │   └── <feature>/
│       │       ├── components/   #     UI for this feature
│       │       ├── services/     #     Server-side reads (*.server.ts)
│       │       ├── actions.ts    #     Server Actions — the writes
│       │       ├── schemas/      #     Zod validation
│       │       ├── lib/          #     Pure logic
│       │       └── types/        #     API contract types
│       └── shared/               #   UI primitives, layout, config, utilities
└── tools/                        # Database migration between MongoDB instances
```

The backend has its own
[README](backend/README.md) with the full endpoint table and the reasoning behind
its storage and concurrency decisions.

---

## Deployment

A checklist for going live:

- [ ] Generate a real `RANMINI_AUTH_JWT_SECRET` and keep it out of the repository.
- [ ] Put MongoDB in a region near Sri Lanka, on a tier **with backups**.
- [ ] Set `RANMINI_RESET_URL` and `CORS_ALLOWED_ORIGINS` to the real public address.
- [ ] Serve the frontend over **HTTPS** — secure cookies depend on it.
- [ ] Keep the API on a private network, reachable only by the frontend server.
- [ ] Set owner passwords, or record the generated ones from the first startup log.
- [ ] Create at least one cashier from **Staff**.
- [ ] Replace the stand-in product photographs with pictures of the shop's own stock.
- [ ] Configure SMTP so owners can reset their own passwords.

To move data between databases — for example from a laptop to Atlas —
use `tools/migrate-mongo.sh`. It refuses to write into a database that already
holds data unless told to with `--overwrite`.

> **Development tip:** `next dev` and `next build` share the `.next` folder.
> Running a build while the dev server is up corrupts it. If the dev server
> starts returning errors, stop both, delete `.next`, and start again.

---

## Known limitations

Recorded honestly so they are not discovered in front of a customer.

- **The till loads the first 100 products, and its search filters those.**
  Products beyond the first hundred cannot be found at the till yet. The API
  already supports search; the till needs to call it.
- **Sessions are not renewed.** A refresh token is issued and stored but not yet
  used, so a session ends when its access token expires and the user signs in
  again.
- **The staff screen shows up to 50 accounts**, with no further pages.
- **Product photographs** can no longer be uploaded from the portal by design;
  the till shows the bundled images, and a new product shows a neutral tile.

---

## Assets and licensing

Photographs live in `frontend/public/images/`, each folder with its own README
recording the source and photographer of every image. All are from Unsplash
under the Unsplash License — free for commercial use, no attribution required.
None may show third-party brand logos.

| Folder | Used by | If a file is missing |
| --- | --- | --- |
| `public/images/auth/` | The sign-in showcase | The brand gradient |
| `public/images/products/` | Product cards on the till | A neutral tile with an icon |

**Currency** is a shop setting (Settings → Business Logic), defaulting to the
rupee.

---

<div align="center">

**Proprietary software.** All rights reserved — see [LICENSE](LICENSE).

Built for Ranmini Hardware, Karadupona, Kegalle.

</div>

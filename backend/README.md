# Ranmini Hardware — POS Backend

Spring Boot 3.5 on Java 21, MongoDB. A modular monolith: one deployable,
organised by feature rather than by technical layer, mirroring the frontend's
own module layout.

Authentication is JWT-based and every endpoint except sign-in and health
requires it.

## Running it

```bash
cp .env.example .env          # then set RANMINI_AUTH_JWT_SECRET

# Option A — a MongoDB you already have (a local service, or Atlas).
# Set MONGODB_URI in .env; it defaults to a local one on the standard port.
mvn spring-boot:run

# Option B — a throwaway one in Docker, on that same default URI
docker compose up -d
mvn spring-boot:run
```

`.env` is read because `application.yml` imports it
(`spring.config.import: optional:file:.env[.properties]`). Spring Boot has no
built-in dotenv support, so without that line the file would sit there being
ignored. The import is optional, so a container or a systemd unit supplying real
environment variables needs no file at all — and a real environment variable
still wins over a line in `.env`, which is what makes
`SERVER_PORT=8099 mvn spring-boot:run` work for a one-off run.

**`RANMINI_AUTH_JWT_SECRET` is the only value with no default.** The service
refuses to start without it, deliberately: a generated key would change on every
restart and invalidate every session, and a committed one would be shared by
every deployment of this code. 32 characters or more — `openssl rand -base64 48`.

Add `-Dranmini.seed.enabled=true` on a **development** database to load a
catalogue and ninety days of sales history to look at. It refuses to run if any
product already exists, so it cannot touch a real shop's data.

- API docs: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`

### The two owner accounts

Both are plain `ADMIN` with **identical** privileges — the owner and his son.
There is deliberately no senior admin: a hierarchy nobody asked for becomes a
permission check nobody can explain.

They are created on a fresh database and never overwritten afterwards, so a
redeploy cannot reset a password that has since been changed. Passwords come
from the environment; leave them blank and a strong one is generated and printed
**once** at first startup. Nothing is hard-coded, because a default password in
the repository means every deployment of this code shares it.

Cashiers are not seeded. An admin creates them from the portal and hands over
the credentials directly — there is no mail server to send an invitation
through.

### Tests

```bash
mvn test      # fast unit tests only, no infrastructure needed
mvn verify    # also the integration tests — needs Docker running
```

The integration tests start a real MongoDB through Testcontainers. That is
deliberate: the behaviour this service depends on most — a conditional update
that must be atomic, a unique index that must reject a duplicate, an aggregation
that must sum `Decimal128` — is exactly what an in-memory fake gets wrong. Two
bugs found during development (an id type mismatch in a raw filter, and a date
range that was exclusive at both ends) were invisible to the compiler and would
have been invisible to a mock.

## Layout

```
lk.ranminihardware.pos
├── catalog/      products, categories, stock movements
├── sales/        checkout, receipts, voids, daily totals
├── reporting/    sales analytics
├── staff/        staff accounts and credentials
├── settings/     the shop's configuration
├── dashboard/    composes figures the other modules produce
└── shared/       errors, paging, money, sequences, config
```

**Module rule:** a feature module may depend on `shared/`, and on another
module only through its published `api` package. `sales` uses
`catalog.api.CatalogApi`; it never touches `catalog.repository` or holds a
`Product`. Without that line the two are welded together and the catalogue can
never change shape without breaking checkout.

## The decisions that matter

### Money is never a double

Every amount is a `BigDecimal` stored as `Decimal128`. A double cannot represent
0.10 exactly, so adding a shop price a thousand times lands on
99.99999999999859 — and a receipt whose total disagrees with the sum of its own
lines is the one bug a shopkeeper will never accept.

Spring Data's default is to store `BigDecimal` as a **string**, which
round-trips but cannot be summed by an aggregation and sorts lexicographically
("9.00" after "10.00"). Every report here sums money in the database, so the
representation is switched to native `Decimal128` in `MongoConfig`.

### The server prices every basket

A checkout request carries product ids and quantities. It carries **no money at
all** — no line prices, no total. Everything is recomputed from the catalogue
and the shop's tax settings, because a total posted by a browser is a number the
customer can edit.

Order is fixed: discount comes off the subtotal, then tax is charged on the
discounted amount. Taxing first overcharges, and the two differ by real money on
a large order.

### Stock cannot be oversold

Reading stock, checking it, and writing it back has a race between the read and
the write: two tills selling the last bag of cement both pass the check and
both sell it. Instead the check and the decrement are **one conditional update**
evaluated by the database, so exactly one wins.

The stored `status` is recomputed inside that same update, as an aggregation
pipeline, because it depends on the new stock value — doing it in a second write
would reintroduce the race the first one closed.

Verified under load: twenty concurrent checkouts against ten units yield exactly
ten sales and a stock of zero, never negative.

### Authentication

Sessions are signed tokens rather than server state, so any instance can verify
one without a shared store — the alternative needs sticky routing or a shared
cache the moment there is a second instance. The cost is that a token cannot be
revoked before it expires, so access tokens are short-lived and refresh re-reads
the account: a cashier deactivated this morning cannot mint a session this
afternoon.

**Every sign-in failure looks the same.** Unknown username, wrong password,
deactivated account, wrong portal — one message, one status, and the same time
spent hashing even when the username does not exist. Distinguishing them turns
the endpoint into an oracle: "no such user" versus "wrong password" tells an
attacker which usernames are real.

**The portal check is server-side.** The frontend has separate admin and cashier
sign-in pages, but that is presentation; a cashier posting to the admin endpoint
is rejected by the service, because the client choosing which door to knock on
must never decide whether it opens. Admins can use the till as well as the
portal, so the owner can cover the counter without a second account.

Authorisation is written **deny-by-default**: `anyRequest().authenticated()` is
the last rule, so an endpoint added tomorrow is protected until somebody
deliberately opens it. Failed sign-ins are counted on the account, not in
memory, so a lockout survives a restart and holds across instances.

**The cashier on a receipt comes from the token, never the request body.** A
till that could name somebody else would make the sales ledger useless for
exactly the question it exists to answer.

### Forgotten passwords

An admin who cannot sign in asks for a link by email; the link opens the reset
page, and the new password takes effect immediately. Cashiers are not offered
this — an admin resets those in person, which is why the till's sign-in page
shows no recovery link rather than a dead end.

Four things make an open, unauthenticated endpoint safe to expose:

- **Asking never reveals whether an account exists.** Registered, unregistered,
  and deactivated addresses all get the same answer. A different response would
  make the form a tool for discovering who works at the shop.
- **Only a SHA-256 of the token is stored.** The value in the email is the only
  copy. That collection is by definition a list of ways into accounts; hashed, a
  leak of it yields nothing usable. SHA-256 rather than BCrypt is deliberate —
  the token is 32 bytes of secure randomness, so slowing a guess down buys
  nothing and costs latency on every validation.
- **A link is single-use and expires** (45 minutes by default, enforced in code
  as well as by a TTL index, because the TTL sweep runs on its own schedule and
  is not prompt enough to be a security control). Spending one link retires the
  person's other outstanding links, so an older email cannot be replayed.
- **Requests are rate-limited** per email address and per caller address, so the
  endpoint cannot be used to flood a member of staff with mail or to get the
  shop's sending domain blacklisted.

A successful reset also clears any lockout: somebody who has just proved control
of the mailbox should not then be told to wait fifteen minutes.

**It works with no mail server.** Leave `SPRING_MAIL_HOST` unset and the service
still starts, still issues links, and writes each one to the log instead of
sending it — loudly, so an operator can see that somebody asked and did not
receive one. A recovery flow that cannot be exercised until a relay is
provisioned is a flow nobody tests.

### Retries are safe

A till that loses the network after posting cannot tell whether the sale landed.
An `Idempotency-Key` (header or body) returns the original sale rather than
charging twice — settled by a unique sparse index, not by an application check
that could race.

### Reporting stays fast as the shop grows

Aggregating the sales collection to draw a chart works beautifully for a month
of data and gets steadily worse forever; by year three the shop scans six
figures of documents to draw thirty points.

So each completed sale atomically increments a **per-day summary document** as
it lands. A month chart reads thirty small documents, and the cost of a report
stops depending on how long the business has been trading. Those figures are
derived data — a failure to update them is logged, never thrown, and they can be
rebuilt from the sales collection, which remains the system of record.

Breakdowns by product or category cannot be pre-summed without a document per
product per day, so those aggregate raw sales — with the range capped at a year
and served by an index.

### Everything is denormalised where reads outnumber writes

- Category name is copied onto each product: every product listing shows it, and
  Mongo has no join worth relying on at scale. A rename fans out once, in
  `CategoryService`.
- Product name, price, **cost** and category are copied onto each sale line. A
  price change next month must not rewrite last month's receipt or its margin.

### Indexes are code

`MongoIndexInitializer` declares every index, applied at startup. Spring's
automatic creation is switched **off**, because it builds lazily on first use —
an unannounced foreground build in the middle of a trading day.

The standing rule is at the top of that file: every query in the service must be
served by an index listed there. A collection scan is invisible on seed data and
fatal on a year of sales.

### Nothing is ever deleted

Products, categories, staff and sales are deactivated or voided, never removed.
Last year's sale references a product; a receipt that cannot name what was sold,
or who sold it, is worthless to the shop and to an auditor. A voided sale keeps
its reason, because the fact that a mistake was made and corrected is itself
part of the record.

### Paging is guarded

Every list endpoint goes through `PageQuery`, which caps the page size, refuses
offsets past 50,000, and **whitelists sort fields** against the declared
indexes. An open `?sort=` lets a caller sort on an unindexed field, which makes
Mongo pull the whole result set into memory and fail past 32MB.

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/v1/auth/{portal}/login` | Sign in — portal is `admin` or `cashier` |
| POST | `/api/v1/auth/refresh` | Exchange a refresh token |
| POST | `/api/v1/auth/password-reset/...` | Request and confirm a reset link |
| GET | `/api/v1/pos/products` | Till catalogue (paged, searchable, no cost prices) |
| POST | `/api/v1/pos/sales` | Complete a sale |
| GET | `/api/v1/categories` | Filter chips |
| POST/PATCH/DELETE | `/api/v1/categories/...` | Manage categories |
| GET | `/api/v1/inventory/products` | Admin table (paged, text search, filters) |
| POST/PUT/DELETE | `/api/v1/inventory/products/...` | Manage products |
| POST | `/api/v1/inventory/products/{id}/stock` | Record a stock movement |
| GET/POST/DELETE | `/api/v1/inventory/products/{id}/image` | Product photograph |
| GET | `/api/v1/inventory/products/by-sku/{sku}` | Shelf-code lookup |
| GET | `/api/v1/inventory/summary` | The four inventory cards |
| GET | `/api/v1/inventory/export` | Stock sheet as a PDF |
| GET | `/api/v1/sales` | Sales in a date range |
| GET | `/api/v1/sales/by-invoice/{n}` | Receipt reprint |
| POST | `/api/v1/sales/{id}/void` | Void and return stock |
| GET | `/api/v1/reports` | Whole reports screen in one payload |
| GET | `/api/v1/reports/export` | The report as a PDF |
| GET | `/api/v1/dashboard` | Whole dashboard in one payload |
| GET | `/api/v1/notifications` | The bell's feed |
| GET | `/api/v1/audit` | The activity log (administrator only) |
| GET/POST/PUT | `/api/v1/staff/...` | Staff accounts |
| POST | `/api/v1/staff/{id}/password` | Reset somebody's password |
| GET/POST/DELETE | `/api/v1/staff/{id}/avatar` | Staff photograph |
| GET/PATCH | `/api/v1/profile/...` | The signed-in account's own details |
| GET/POST/DELETE | `/api/v1/profile/avatar` | Own photograph |
| GET/PATCH | `/api/v1/settings/...` | Shop configuration (administrator only) |
| GET | `/api/v1/settings/public` | The subset the till needs — also readable by a cashier |
| POST/DELETE | `/api/v1/settings/logo` | Replace or remove the shop logo |
| GET | `/api/v1/settings/public/logo` | The logo image — the till prints it |

## Still to do

1. **`/swagger-ui.html` is still open.** It is reachable by anyone who can reach
   the service. Acceptable while this is bound to a shop's local network, but it
   must go behind authentication before the API is exposed more widely.
2. **Rate limiting** on the API, matching the throttle already in the Next.js
   BFF. The per-account lockout covers password guessing against one user; it
   does not cover a spray across many.
3. **A summary rebuild job**, so the derived daily totals can be recomputed from
   sales on demand rather than only in principle.
4. **Refresh-token rotation.** A refresh token is currently reusable until it
   expires; rotating it on each use would limit the damage from a stolen one.

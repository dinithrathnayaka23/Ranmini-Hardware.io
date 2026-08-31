# Ranmini Hardware — POS Backend

Spring Boot 3.5 on Java 21, MongoDB. A modular monolith: one deployable,
organised by feature rather than by technical layer, mirroring the frontend's
own module layout.

Authentication is **not** built yet — every endpoint below is currently open.
That is the next phase, along with wiring the frontend to these endpoints.

## Running it

```bash
cp .env.example .env          # then fill in MONGODB_URI

# Option A — a MongoDB you already have (a local service, or Atlas)
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.data.mongodb.uri=mongodb://localhost:27017/ranmini_pos"

# Option B — a throwaway one in Docker
docker compose up -d
mvn spring-boot:run
```

Add `-Dranmini.seed.enabled=true` on a **development** database to load a small
catalogue that matches the till's mock-up. It refuses to run if any product
already exists.

- API docs: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`

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
the write: two tills scanning the last bag of cement both pass the check and
both sell it. Instead the check and the decrement are **one conditional update**
evaluated by the database, so exactly one wins.

The stored `status` is recomputed inside that same update, as an aggregation
pipeline, because it depends on the new stock value — doing it in a second write
would reintroduce the race the first one closed.

Verified under load: twenty concurrent checkouts against ten units yield exactly
ten sales and a stock of zero, never negative.

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
| GET | `/api/v1/pos/products` | Till catalogue (paged, searchable, no cost prices) |
| GET | `/api/v1/pos/products/by-sku/{sku}` | Barcode lookup |
| POST | `/api/v1/pos/sales` | Complete a sale |
| GET | `/api/v1/categories` | Filter chips |
| POST/PATCH/DELETE | `/api/v1/categories/...` | Manage categories |
| GET | `/api/v1/inventory/products` | Admin table (paged, text search, filters) |
| POST/PUT/DELETE | `/api/v1/inventory/products/...` | Manage products |
| POST | `/api/v1/inventory/products/{id}/stock` | Record a stock movement |
| GET | `/api/v1/inventory/summary` | The four inventory cards |
| GET | `/api/v1/sales` | Sales in a date range |
| GET | `/api/v1/sales/by-invoice/{n}` | Receipt reprint |
| POST | `/api/v1/sales/{id}/void` | Void and return stock |
| GET | `/api/v1/reports` | Whole reports screen in one payload |
| GET | `/api/v1/dashboard` | Whole dashboard in one payload |
| GET/POST/PUT | `/api/v1/staff/...` | Staff accounts |
| GET/PATCH | `/api/v1/settings/...` | Shop configuration |

## Still to do

1. **Authentication and authorisation.** The staff documents already carry
   password hashes, lockout counters and roles so this is an addition rather
   than a migration. `/swagger-ui.html` must go behind it in the same change.
2. **Wire the frontend** to these endpoints, replacing its placeholder
   constants.
3. **`cashierId` is currently accepted from the client** on checkout. It must
   come from the session once sessions exist — a till should not be able to
   attribute a sale to somebody else.
4. **Rate limiting** on the API, matching the throttle already in the Next.js
   BFF.
5. **A summary rebuild job**, so the derived daily totals can be recomputed from
   sales on demand rather than only in principle.

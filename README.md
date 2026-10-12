<div align="center">

# Ranmini Hardware — POS & Inventory

**Point of sale, inventory and reporting for Ranmini Hardware, Karadupona, Kegalle.**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-149ECA?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

</div>

---

## About

A web application with two sides:

- **The till**, used by the cashier at the counter to ring up sales and print receipts.
- **The management portal**, used by the owner to run the business: stock,
  reports, staff and settings.

Each side has its own sign-in page, and each account can use only its own side.

| | Management portal | Till |
| --- | --- | --- |
| **Used by** | The owner | The cashier |
| **Sign in at** | `/admin/login` | `/cashier/login` |
| **Opens on** | `/admin/dashboard` | `/cashier/pos` |

---

## Features

### Management portal

- **Dashboard** — today's and this month's takings, profit, stock value and the
  products running low.
- **Inventory** — search and browse the catalogue, add and edit products, record
  deliveries and stock corrections, manage categories, import products from a
  CSV file, and download a PDF stock sheet.
- **Reports** — revenue trend, category share, best sellers and daily totals for
  any period, a day-by-day list of sales with receipt lookup, and PDF export.
- **Staff** — create accounts, set a temporary password, add an email address,
  and deactivate or restore an account.
- **Settings** — shop details and logo, tax rate and currency, receipt format,
  and security options.
- **Notifications** — low-stock and out-of-stock products, and recent voided
  sales.
- **Profile** — the owner's name, photo and password.

### Till

- Product search as you type, by name, brand or shelf code, with category
  filters.
- Keyboard shortcuts for a fast checkout: **F2** search, **Enter** add,
  **F9** cash, **F10** pay, **Esc** clear.
- Cash handling with suggested amounts and the change shown clearly.
- Receipt printing straight after the sale.
- Low-stock alerts for the cashier.
- Works on a phone, a tablet and a desktop screen.

### Password recovery

- The owner, and a cashier with an email address, can reset a forgotten
  password with an emailed link.
- A cashier without an email address can ask the owner from the sign-in page;
  the owner then sets a temporary password, which the cashier replaces at their
  next sign-in.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Java, Spring Boot |
| Database | MongoDB |

---

## Project structure

```
Ranmini-Hardware.io/
├── .env.example        # Configuration template
├── backend/            # Spring Boot API
│   └── src/main/java/lk/ranminihardware/pos/
│       ├── auth/           # Sign-in and password reset
│       ├── catalog/        # Products, categories, stock
│       ├── sales/          # Checkout, receipts, voids
│       ├── reporting/      # Reports and the sales PDF
│       ├── dashboard/      # Dashboard figures
│       ├── notifications/  # Owner and till alerts
│       ├── staff/          # Staff accounts and profiles
│       ├── settings/       # Shop settings and logo
│       ├── audit/          # Activity log
│       └── shared/         # Configuration, errors, utilities
├── frontend/           # Next.js app
│   └── src/
│       ├── app/            # Pages and routes
│       ├── modules/        # One folder per feature
│       └── shared/         # Shared components and helpers
└── tools/              # Database copy script
```

Both the backend and the frontend are organised by feature rather than by file
type.

---

## Getting started

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 20 or newer |
| Java | 21 |
| Maven | 3.9 or newer |
| MongoDB | 7 — a local install, Docker, or an Atlas cluster |

### 1. Configure

```bash
cp .env.example .env
```

Open `.env` and set **`RANMINI_AUTH_JWT_SECRET`** to a random string of at
least 32 characters, for example the output of:

```bash
openssl rand -base64 48
```

The other values work as they are for local development. There is one `.env`
at the repository root for both the backend and the frontend, and it is never
committed.

### 2. Start the backend

```bash
cd backend

# Use the MongoDB in MONGODB_URI (localhost:27017 by default)
mvn spring-boot:run

# Or start a local MongoDB in Docker first
docker compose up -d
mvn spring-boot:run
```

The API runs at `http://localhost:8080`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### 4. Sign in

| Account | Username | Sign in at |
| --- | --- | --- |
| Owner | `owner` | `http://localhost:3000/admin/login` |
| Cashier | `nemina2003` | `http://localhost:3000/cashier/login` |

- **Owner:** the account is created automatically on first start. Set its
  password with `RANMINI_ADMIN_PASSWORD` in `.env`. If that is left blank, a
  password is generated and printed once in the backend log on the first run.
- **Cashier:** created by the owner from **Staff** in the management portal.

---

## Configuration

All settings live in the root `.env`. The main ones:

| Variable | Purpose |
| --- | --- |
| `RANMINI_AUTH_JWT_SECRET` | Signs session tokens. Required. |
| `MONGODB_URI` | MongoDB connection string, including the database name |
| `API_BASE_URL` | Where the frontend reaches the API |
| `CORS_ALLOWED_ORIGINS` | Browser origins allowed to call the API |
| `RANMINI_ADMIN_USERNAME` / `_NAME` / `_EMAIL` / `_PASSWORD` | The owner's account |
| `SPRING_MAIL_HOST` / `_PORT` / `_USERNAME` / `_PASSWORD` | SMTP for password-reset emails |
| `RANMINI_RESET_URL` / `RANMINI_CASHIER_RESET_URL` | The reset pages the emailed links open |
| `API_DOCS_ENABLED` | Set to `true` to open the API docs at `/swagger-ui.html` while developing |

`.env.example` describes every variable.

> **Gmail:** use a 16-character App Password, not the account password.

---

## Testing

```bash
# Backend
cd backend
mvn test        # unit tests
mvn verify      # unit and integration tests (needs Docker)

# Frontend
cd frontend
npx tsc --noEmit
npm run lint
```

---

## Moving data between databases

`tools/migrate-mongo.sh` copies a database from one MongoDB to another, for
example from a local machine to Atlas.

---

## Assets

Product and sign-in photographs in `frontend/public/images/` are from Unsplash,
under the Unsplash License. Each folder has a README listing the source of every
image.

---

<div align="center">

**Proprietary software.** All rights reserved — see [LICENSE](LICENSE).

Built for Ranmini Hardware, Karadupona, Kegalle.

</div>

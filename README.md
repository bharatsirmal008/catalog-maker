# Catalog Maker

Catalog Maker is a mobile-first platform that imports Shopify and WooCommerce products into PostgreSQL and serves customers from a fast internal catalog. Day 1 establishes the application, relational model, security boundaries, health endpoint, route placeholders, and deployment baseline. CRUD, authentication, imports, synchronization, and final catalog features are intentionally out of scope.

## Architecture

```text
Shopify / WooCommerce (future)
            |
      server-only connectors
            |
       sync service (future)
            |
   PostgreSQL <- Prisma <- Next.js route handlers
                              |
                    catalog and admin routes
```

- `src/app/(catalog)` contains public catalog routes.
- `src/app/admin` is a restricted placeholder with no management actions.
- `src/app/api` contains server route handlers.
- `src/lib/db` owns the server-only database client.
- `src/lib/integrations` reserves isolated source connectors; `src/lib/sync` will own orchestration.
- `prisma` contains the model and versioned migrations.

## Technology

- Next.js 16.3.5, App Router, React 19.2.8, TypeScript 5, Tailwind CSS 4
- Prisma ORM/Client 7.10.0 with `@prisma/adapter-pg`
- PostgreSQL 17 (Docker for local development)
- ESLint 9

## Prerequisites

- A Prisma-supported LTS Node.js release; Node 24 is recommended. Node 26.7.0 worked on Day 1 but is outside Prisma 7's documented supported LTS range.
- npm 11+, Git, and PostgreSQL 14+ or Docker Desktop.

## Install and configure

```powershell
git clone <repository-url>
cd catalog-maker
npm install
Copy-Item .env.example .env
```

Edit `.env` locally and never commit it. For local PostgreSQL, create a unique password and use it in both the container and `DATABASE_URL`:

```powershell
docker run --name catalog-maker-postgres `
  -e POSTGRES_USER=catalog_user `
  -e POSTGRES_PASSWORD=<local-password> `
  -e POSTGRES_DB=catalog_maker `
  -p 127.0.0.1:5432:5432 `
  -v catalog-maker-postgres-data:/var/lib/postgresql/data `
  -d postgres:17-alpine

npm run db:validate
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

All credentials are server-only and have no `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SHOPIFY_STORE_URL` | Shopify development/store URL |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | Server-side app credentials used to request short-lived tokens |
| `SHOPIFY_API_VERSION` | Explicit supported Admin API version |
| `WOOCOMMERCE_STORE_URL` | HTTPS WordPress/WooCommerce base URL |
| `WOOCOMMERCE_CONSUMER_KEY` / `WOOCOMMERCE_CONSUMER_SECRET` | Read-only REST API credentials |
| `ADMIN_SETUP_EMAIL` / `ADMIN_SETUP_PASSWORD` | Temporary CLI-only account provisioning; use the masked PowerShell setup script |
| `APP_URL` | Canonical application origin |

Production should use a secret manager and least-privilege database user. `SourceConnection` stores only a credential reference, never a secret.

## Commands

```powershell
npm run dev          # development server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run typecheck    # TypeScript validation
npm run db:validate  # validate schema
npm run db:generate  # generate client
npm run db:migrate   # create/apply development migrations
```

## Routes

- `GET /` — searchable, filtered, paginated customer catalog
- `GET /categories/[slug]` — category collection
- `GET /products/[id]` — details, variants and related products
- `GET /admin` — authenticated administrator API workspace
- `GET /api/health` — executes `SELECT 1`; returns 200 when connected or 503 without leaking credentials/stack traces

## Current status

Completed: scaffold, styling, modular structure, PostgreSQL, relational schema/migration, server-only Prisma singleton, health endpoint, route foundations, production build, and integration/deployment documentation.

Day 2 adds authenticated product/category management APIs, public catalog APIs, six categories and 16 local demo products. See [Day 2](docs/day-02.md) for routes, setup and verified tests.

Day 3 adds the responsive customer catalog. See [Day 3](docs/day-03.md) for architecture and actual verification.

Day 4 adds the gallery/lightbox, persistent wishlist, multi-product enquiries
and WhatsApp message preview. See [Day 4](docs/day-04.md) and the
[combined development report](docs/final-development-report.md).

Customer routes also include `/wishlist` and `/enquiry`. Sign in at `/admin/login`
and set your own business name and international WhatsApp number in `/admin`.
The default number is unset; no real destination is hardcoded. Customers must
review and send the prepared message themselves. There is no checkout/payment.

For a local production preview, build first, set `APP_URL=http://localhost:3000`
in the process environment, and run `npm run start`. Real production requires
HTTPS and a matching canonical APP_URL. Use `npm run dev` for ordinary local
development. Localhost product links cannot be opened from another device.

Verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
For the local database/API suite, set `ALLOW_INTEGRATION_TESTS=true` and run
`npm run test:api` while the application and PostgreSQL are running. This creates
temporary test records and removes them afterward. Do not target a live store.

To provision an administrator from PowerShell: `.\scripts\create-admin.ps1` (PowerShell 7 is not required). To seed local demo records, set `ALLOW_DEMO_SEED=true` and run `npm run db:seed`. Use Node 24 LTS (`.nvmrc`).

Not implemented yet: live external imports, synchronization, second design or deployment.

Day 5 adds a server-only Shopify GraphQL connector and protected connection check.
See [Day 5](docs/day-05.md) and [Shopify setup](docs/shopify-setup.md).
External account/store setup is deferred until the end of Days 5–10 work;
fixture tests do not represent a live Shopify connection or live imports.

Day 6 adds transactional source imports and admin source controls. See
also [Day 7 synchronization and recovery](docs/day-07.md) for checkpoint and full-reconciliation policy.
[Day 6](docs/day-06.md). `npm run test:import` runs the opt-in, local PostgreSQL
fixture suite. No production external store is required for these tests.

See [Day 1 report](docs/day-01.md) and [integration prerequisites](docs/integration-prerequisites.md).

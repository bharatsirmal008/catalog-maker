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

- `GET /` — public catalog placeholder
- `GET /admin` — restricted placeholder without management controls
- `GET /api/health` — executes `SELECT 1`; returns 200 when connected or 503 without leaking credentials/stack traces

## Current status

Completed: scaffold, styling, modular structure, PostgreSQL, relational schema/migration, server-only Prisma singleton, health endpoint, route foundations, production build, and integration/deployment documentation.

Day 2 adds authenticated product/category management APIs, public catalog APIs, six categories and 16 local demo products. See [Day 2](docs/day-02.md) for routes, setup and verified tests.

To provision an administrator: `pwsh -File scripts/create-admin.ps1`. To seed local demo records, set `ALLOW_DEMO_SEED=true` and run `npm run db:seed`. Use Node 24 LTS (`.nvmrc`).

Not implemented yet: external connectors, synchronization, second design or deployment.

See [Day 1 report](docs/day-01.md) and [integration prerequisites](docs/integration-prerequisites.md).

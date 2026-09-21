# Catalog Maker — Days 2–4 development report

## Phase summaries

Day 2: PostgreSQL-backed catalog services, strict input validation, minimal public
DTOs, search/filter/sort/pagination, protected product/category/settings APIs,
secure administrator sessions and a repeatable local seed. See `day-02.md`.

Day 3: responsive single-template catalog, category pages, detail/variant pages,
search URLs, paging, related products, loading/empty/error/not-found states,
restricted image hosts and local illustrations. See `day-03.md`.

Day 4: interactive accessible gallery, persistent ID-only wishlist and enquiry
selections, current-data batch loading, WhatsApp message preview and configurable
destination, admin settings form, tests and cleanup. See `day-04.md` for the
actual PASS/NOT RUN matrix and limitations.

## Project directory map

```text
catalog-maker/
  prisma/
    schema.prisma
    migrations/20260920172813_init/
    migrations/20260920174759_admin_sessions/
  public/demo/                    # six illustration families with detail assets
  scripts/                       # seed.ts, create-admin.ts, create-admin.ps1
  src/
    app/
      (catalog)/                 # home, categories/[slug], products/[id]
        wishlist/  enquiry/      # client selections on shared catalog layout
        layout.tsx  loading.tsx  error.tsx
      admin/                     # authenticated workspace/settings and login
      api/
        health/  categories/  catalog/config/
        products/[id]/related/
        admin/                   # products, categories, config, login/logout/session
      globals.css  layout.tsx  not-found.tsx
    components/
      admin/                     # LoginForm, LogoutButton, CatalogSettings
      catalog/                   # shared listing/detail/gallery/selection controls
    lib/
      api/http.ts  auth/  db/  validations/
      catalog/                   # shared services, formatting, storage, WhatsApp
    generated/prisma/            # generated typed Prisma client
    types/catalog.ts             # service-derived DTO types
  tests/unit/                    # validation and interaction regression tests
  tests/integration/             # real API suite and interactive browser fixture
  docs/                          # daily reports and integration prerequisites
  README.md  .env.example  .nvmrc
```

## New and modified files

Day 2 introduced auth/API/services/validation/seed/test modules, the additive
session migration and generated client updates. Day 3 added catalog pages,
shared display components, format helpers and CSS, and updated the homepage,
Next image configuration and README. The exact historical file manifests are
available with `git show --stat e3338cd` and `git show --stat 50515df`.

Day 4 new files: wishlist and enquiry route pages; CatalogSettings; ProductActions;
ProductGallery; SelectedProducts; SelectionLinks; SelectionProvider;
selection-storage.ts; whatsapp.ts; interactions.test.ts; customer-fixture.ts;
day-04.md; this report. Modified: catalog layout, admin page, CSS, not-found,
CatalogHeader, ProductCard, ProductDetail, slug helper, API integration test,
README and Day 3 report. No credentials are included in these files.

## Database and migrations

Ten models: SourceConnection, Product, Category, ProductImage, ProductVariant,
SyncRun, CatalogConfig, AdminUser, AdminSession and LoginThrottle. Product prices
and variant prices use Decimal(12,2); external product identity is scoped to a
source connection. Category hierarchy and display/visibility are preserved.
Images/variants cascade on product deletion; category deletion keeps products.
Sessions reference administrators and store only hashed random tokens.

The original `20260920172813_init` migration remains intact. The sole additional
migration, `20260920174759_admin_sessions`, adds session/throttle persistence.
Days 3–4 introduce no schema changes. Demo data is 16 local products and six
categories, not imported commerce data.

## HTTP surface

Public GET: `/api/health`, `/api/categories`, `/api/products`,
`/api/products/[id]`, `/api/products/[id]/related`, `/api/catalog/config`.
Products support q, category, available, allowlisted sort, page/limit and a bounded
ids list. Details of hidden products are not public. Responses do not expose
administrator identities, credential references or internal source settings.

Admin: POST `/api/admin/login`, POST `/api/admin/logout`, GET
`/api/admin/session`; GET/POST `/api/admin/products` and `/api/admin/categories`;
PATCH/DELETE `/api/admin/products/[id]` and `/api/admin/categories/[id]`;
GET/PATCH `/api/admin/config`. Source-owned imported fields are protected.

## Authentication

CLI-only admin provisioning; no public registration/default admin. Passwords use
salted scrypt. Login creates a random token; the database stores its SHA-256
hash and eight-hour expiry. Cookies are HttpOnly/SameSite Strict, additionally
Secure with a `__Host-` name in production. Every protected operation checks the
server-side session. Mutations require the configured same origin. Login has a
persistent per-account/window throttle. Logout revokes the session. Production
still needs HTTPS, ingress rate limiting and deployment-specific hardening.

## Verification and performance

32 unit tests, TypeScript, ESLint and the production build passed. The 20-group
API integration suite passed in development and, after configuring APP_URL, on
the production build. The real browser workflow covered protected product
creation through customer discovery, saved selection, multi-product enquiry,
encoded link checks and protected price update reflected in customer pages.
No external commerce API or message sending was needed.

See the detailed Day 4 matrix for missing coverage. No Lighthouse, throughput,
bundle-budget or real-device latency benchmark was collected. Bounded listing
and selection queries, minimal DTOs, lazy images and modal-only enlarged images
are design choices, not claimed measured speed improvements.

## Commits and readiness

- Day 1: `5ab93db`.
- Day 2: `e3338cd`.
- Day 3: `50515df`.
- Day 4: the commit containing this report, titled
  `feat: implement wishlist product gallery and whatsapp enquiries` (use
  `git log -1 --oneline` after completion for its identifier).

Days 2–4 implementation is complete with the disclosed unrun edge tests and
dependency findings. Ready for authorized Day 5 planning, not production launch.
Do not automatically begin Day 5. Required next inputs: authorized Shopify
development store, Admin API access and product-read permissions, secure
credential storage, repeatable 50-product demo setup, product/variant field
mapping, pagination design and import/duplicate/error testing plan. WooCommerce
comes later. Neither integration is implemented or represented by local seeds.

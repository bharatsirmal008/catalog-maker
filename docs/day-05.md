# Day 5 — secure Shopify foundation

## Starting state

Clean master at fe1adc8. Next 16.3.5, React 19.2.8, Prisma 7.10.0, Node 24;
ten existing database models and two migrations. Shopify/WooCommerce folders
contained only .gitkeep. Day 2 server auth/API helpers and Day 3–4 catalog remain
in place. SourceConnection already has a credentialKey reference and scoped
product identity, so no migration is necessary for connection checking.

## Implementation

Server-only modules: integrations/errors.ts; shopify/config.ts, client.ts,
products.ts and connection.ts. Public catalog requests never call these modules.
POST /api/admin/integrations/shopify/check is admin-only, same-origin protected,
accepts only an empty strict-Zod body and loads credentials from the server.
The route does not create a source or persist a frontend-claimed success.

Canonical myshopify.com domain-only validation, HTTPS, redirect rejection,
explicit API version, token expiry, typed Zod responses, bounded retries/timeouts,
GraphQL-error checks and independently complete nested pagination are implemented.
No raw remote error, secret or authorization header is returned or logged.
Safe errors distinguish configuration, authentication, permission, timeout,
network, throttling, remote rejection, invalid response and pagination failure.

API pin: 2026-07. Same-organization client-credentials grant; required read_products
and read_inventory. Setup, field contract, pagination and demo preparation are in
shopify-setup.md with current official sources. No Shopify external setup occurred.

Sanitized **fixture**, not live data: product gid://shopify/Product/1 named
“Fixture product”, variant price "19.99", currency INR, unknown quantity null,
two variants, two collections and one image after traversing all fixture pages.
No products are written by Day 5 retrieval.

## Verification status

PASS: `npm test` — 54 tests, including 22 Shopify checks and 32 existing tests.
PASS: `npm run lint`. PASS: `npm run build`, including its TypeScript check.
The initial standalone typecheck found inference issues; explicit pagination
types and typed fixture config fixed them before the successful build.
PASS: `ALLOW_INTEGRATION_TESTS=true TEST_BASE_URL=http://localhost:3001 npm run test:api`
against the new production build — 20 groups, including unauthenticated Shopify
check rejection, cross-origin rejection and rejection of token-bearing bodies.
No live credentials were used by these checks. Browser regression NOT RUN this
day because customer UI was unchanged; Days 3–4 browser evidence is preserved.
Real store connectivity / read-only sample / 50-product count: BLOCKED, external
setup deferred by user. Known external product count unknown; live imports zero.

## Next

Day 6 will consume the validated source DTO and add transactional, source-scoped
idempotent persistence plus protected import controls. No full import, sync or
WooCommerce work is part of this Day 5 commit.

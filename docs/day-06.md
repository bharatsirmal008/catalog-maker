# Day 6 — transactional Shopify import

Starting from verified Day 5 commit 65bbf6b, added source-normalization DTO,
Shopify mapper, shared transactional persistence, per-source PostgreSQL advisory
locking, durable SyncRun results and protected source registration/import/history.
External setup remains deferred. **Live Shopify imports: 0; external store product
count unknown.** The successful 50-product tests use deterministic fixtures.

## Mapping and identity

Source identity is (sourceConnectionId, external product ID), never title or SKU.
Variant identities retain local IDs on upsert. Source-scoped categories use an
additive compound unique constraint. Product/category slugs derive from SHA-256
of source identity; they are stable and independent of mutable titles. Images
are atomically replaced and deduplicated by URL. Removed variants are removed
only after a complete validated source product was retrieved.

Title, plain-text description, minimum exact decimal variant price, source shop
currency, SKU, images, variants, source URL and category association follow the
source. Price selection uses integer arithmetic, not floating-point comparison.
Unknown/untracked stock stays null; tracked zero remains zero. Variant availability
is stored separately so backorders do not become falsely out-of-stock. Archived,
unpublished and unlisted Shopify products are not publicly displayed.

Local isVisible/isFeatured/displayOrder are never overwritten. sourceVisible is
an additional independent public-read condition. Source change hashes skip
unchanged records; sourceUpdatedAt prevents an older snapshot rolling back a
newer one. A product's first sorted collection is its primary catalog category;
all memberships, tags and variant timestamps remain in private source metadata.
Imported categories permit local visibility/order changes but reject deletion
or source-field editing. Existing manual category behavior is unchanged.

## Migration

20260921130000_source_import adds SourceConnection.verifiedAt, Product source
timestamp/hash/visibility/metadata, Category scoped source identity and nullable
ProductVariant.availability. Applied forward-only with `prisma migrate deploy`;
schema validation and generation passed. Existing local rows default sourceVisible
to true and retain all data. No previous migration was replaced.

## Routes and administrator workflow

- GET /api/admin/sources: safe connection details, counts and ten recent runs.
- POST /api/admin/sources `{provider:"SHOPIFY"}`: verifies the server-configured
  store and grants before registering it; no browser-supplied credentials/URLs.
- POST /api/admin/sources/[id]/import `{confirm:true}`: authorized manual import.
- GET /api/admin/sources/[id]/runs: twenty recent results.

The admin dashboard offers connection registration, confirmation before import,
disabled duplicate-submit controls, loading text and statistics/history. No fake
percentage is shown. All handlers authenticate server sessions; mutations enforce
the configured Origin and strict Zod payloads. Secrets stay in environment/secret
manager, referenced by SHOPIFY_DEFAULT. This stage supports one configured live
Shopify store; database identity already isolates multiple sources in tests.

## Execution and failure policy

The local long-running Node server supports a bounded synchronous import, not
serverless/Edge execution. A dedicated PostgreSQL connection holds a per-source
session advisory lock while network retrieval happens outside write transactions.
Each product, its categories/images/variants commit in one transaction; one bad
record does not corrupt others. Counters persist after each page. Any failure
means FAILED, never a false success. Restarting after interruption marks the
abandoned RUNNING history failed after obtaining the lock. No checkpoint is
advanced in Day 6. No data is deleted just because a source request fails.

Safety ceilings: 1,000 products per run; eight-minute connector budget;
ten-minute import budget; 30-second product transaction. Hitting a ceiling fails
explicitly and allows an idempotent retry. Larger stores or short-runtime hosting
need a durable resumable worker before deployment. No scheduler was installed.

## Tests

PASS: real PostgreSQL fixture suite (`ALLOW_INTEGRATION_TESTS=true npm run test:import`):
50 inserted; repeat 50 skipped/zero duplicates; second store inserted same identity
independently; exact price update; stable variant ID/local overrides; actual int32
overflow rolled back product/category/image work; partial failure marked FAILED;
simultaneous same-source request rejected; shared customer service retrieval;
unknown quantity preserved; manual/local products unchanged. Fixtures cleaned up.

PASS: 58 unit tests, including four mapper tests. Initial TypeScript ES-target
syntax and React effect lint issues were found and corrected before final checks.
Production build and ESLint passed; protected-route regression passed all 20 groups.
Live 50-product import: BLOCKED (external setup last). Browser admin/imported-card
workflow: NOT RUN yet. Shopify images allow only HTTPS cdn.shopify.com/s/files/**;
other sources show the existing image fallback, not an unrestricted proxy.

Next: Day 7 synchronization checkpoints, verified deletion reconciliation and
failure/recovery tests. No live imports or external product creation are claimed.

# Day 7 — Shopify synchronization and recovery

Built on Day 6 commit 231edfc. The existing importer already upserts new and
changed products, removes old variants/images only inside a complete product
transaction, hides unpublished products and preserves local display controls.
It did not checkpoint successful runs or reconcile hard-deleted products.

## Implementation

The shared runner now accepts a checkpoint-aware reader and optional verified
absence reconciliation. Shopify sync reuses the existing client, mapper,
pagination and product transactions. POST /api/admin/sources/[id]/sync accepts
strict `{confirm:true, full?:boolean}` and requires admin authentication plus
same-origin protection. The dashboard adds incremental/full actions, loading
feedback and last successful synchronization. Existing run history is reused;
no schema migration or scheduler was necessary.

Checkpoint is the database run-start timestamp, persisted atomically with the
successful run result and verified hiding. The next query includes updated_at
from five minutes before that checkpoint through the new run start, inclusive.
Shopify UPDATED_AT sorting and opaque cursors traverse timestamp ties; overlapping
records are idempotent. Initial sync has no filter. Failed pages, individual
records or reconciliation never advance the checkpoint. Clock skew exceeding
the overlap and late source indexing require full reconciliation.

Full reconciliation re-reads all products and nested variants/media/collections.
After all pages and records succeed, it checks permissions again and individually
queries each missing existing source ID. Only successful null product responses
are treated as verified absence. All checks finish before a single transaction
hides those products, clears their hashes and advances the checkpoint. Rows,
variants, local IDs and customer selections are retained. Reappearance restores
source visibility without overwriting local visibility/featured/order controls.
Incremental queries alone are not a complete inventory/membership/deletion feed;
use manual full reconciliation for those changes and currency-wide changes.

The PostgreSQL per-source advisory lock works across application instances.
Connection errors stop processing; each product transaction also locks/checks
the RUNNING audit row, fencing workers whose interrupted run was superseded.
The next lock holder marks abandoned RUNNING records failed. Successfully written
products survive partial failures; retries re-read the old checkpoint. Local
products, WhatsApp settings and catalog template remain untouched.

## Verification

60 unit tests passed, including fixed-window/timestamp overlap checks. Client
fixtures cover timeouts, authentication/permission errors, throttling and cursor
failures. PostgreSQL tests now cover checkpoint preservation, reconciliation
failure, hide/restore identity, interrupted-run recovery and stale-run fencing.
PostgreSQL initially refused connections while Docker Desktop was stopped.
Restarting the existing Docker installation restored the preserved database;
all 12 fixture groups passed, including 50 inserts, 50 repeat skips, partial
failure, successful-checkpoint persistence, failed-checkpoint preservation,
hide/restore identity and stale-run fencing. Temporary fixtures were cleaned up.
ESLint, Prisma validation and production build (including TypeScript) passed.
API regression passed all 20 groups against the fresh build at localhost:3002,
including unauthorized sync, cross-origin and unknown-field rejection.
Browser smoke check loaded the 16-product local catalog. Live source controls
remain unverified in the browser because external setup is intentionally deferred.
Live Shopify demonstration: BLOCKED, intentionally deferred to external setup.
No live prices, inventory or store products were modified.

Bounds remain 1,000 products, eight-minute connector and ten-minute runner budgets.
This is a long-running local Node operation, not a durable scheduled worker or
point-in-time Shopify snapshot. Larger stores need a resumable design. Null is
source absence under verified current permissions, not proof of a deletion event.

References: [Shopify products and updated_at filter](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/products),
[single-product lookup](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/product).

Day 8 can reuse SourceProduct, transactional persistence, locks and audit records
for a provider-specific WooCommerce connector. External setup stays last.

# Day 8 — WooCommerce import

Added server-only WooCommerce config, DNS-pinned HTTPS transport, typed REST
schemas/pagination, mapper and importer. Existing Shopify client is unchanged.
Both providers use SourceProduct, per-source PostgreSQL locks, atomic product
upserts and SyncRun history. No migration or additional runtime dependency.

The existing POST /api/admin/sources accepts WOOCOMMERCE to verify and register
the environment-configured store. POST /api/admin/sources/[id]/import dispatches
by the database provider. Existing authentication, strict payload validation and
same-origin protection apply. UI exposes independent provider registration and
shared import/history controls. Credentials never appear in responses.

Current price (including active sale) is authoritative. Variable products use
the minimum price among published variations, exact decimal comparisons and
independent variation stock availability. Unknown/unmanaged stock is null; zero
is retained; parent-managed stock follows the parent. Unpublished/hidden/search-
only products are not publicly listed. All supported variants and images are
retrieved; an incomplete variant set fails rather than deleting old variants.
Descriptions become plain text. Primary category is the first source membership;
ancestors and source-scoped parent relationships are retained. Local controls
and unrelated sources are preserved. Grouped/external products fail explicitly.

Image policy adds only the configured store's uploads directory, with no redirect
following. Environment changes require a rebuild for the public image origin.
See woocommerce-setup.md for limitations and final external setup steps.

Verification: 77 unit tests, ESLint and production build/TypeScript PASS.
Database fixture suite PASS: 50 WooCommerce records inserted, 50 repeat skips,
correct category hierarchy and preservation of Shopify records (13 total groups).
Live source product count
unknown; live WooCommerce imported count 0. Public browsing remains internal-DB
only. Browser testing for both providers is completed with the Day 10 shared UI
regression where feasible; live WooCommerce images and real imports remain BLOCKED.

Changed areas: integrations/woocommerce/*; shared persistence parent mapping;
source registration/import routes; SourceManager; image policy/Next configuration;
WooCommerce unit and database fixtures. Next: Day 9 shared adapters, management
and WooCommerce incremental synchronization. No source was created externally.

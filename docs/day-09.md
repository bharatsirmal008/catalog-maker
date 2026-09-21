# Day 9 — unified source management

Day 8 baseline: Shopify/WooCommerce connectors fixture-tested; live accounts and
imports deferred. No real external products are claimed. Local demo catalog has
16 products; temporary tests independently exercise 50 Shopify and 50 WooCommerce
mapped records, then remove only their own fixtures.

`CatalogSourceAdapter` registers, tests, imports and synchronizes each provider.
API dispatch reads the provider from SourceConnection; it accepts no arbitrary
URL or credential. Provider clients/mappers remain separate. Both share locked,
transactional persistence and SyncRun histories. No database migration.

WooCommerce sync uses documented modified_after/modified_before and
dates_are_gmt=true with a five-minute overlap. Page order is stable ID order;
timestamp ties are included through overlap. All product and variation pages
must finish. The run-start checkpoint advances only on complete success.
Variation-only changes, category renames and currency-wide changes require
manual full reconciliation; incremental product filters are not a complete feed.
Full reconciliation hides missing rows only after an authenticated individual
lookup returns WooCommerce's product-invalid-ID 404 code. Generic 404s, errors,
empty/incomplete pages never prove absence. Shopify retains its own lookup policy.

Source controls: POST /api/admin/sources/[id] `{action:"check"}` and PATCH
`{enabled:boolean}`. Enablement takes the same source advisory lock and returns
409 during an active run. Disablement stops future runs, not customer visibility.
Credentials rotate server-side only. Past verification timestamps are explicitly
not a current availability guarantee. Source history and safe errors remain
visible. Admin overview includes internal/public counts and source counts;
product management offers source labels, search, paging, manual create/edit,
local visibility/featured/order controls. Imported source fields remain protected.

Tests added: Woo GMT boundary; verified 404 distinction; different-source
concurrent sync; source-isolated failure/checkpoint; disable/re-enable catalog
preservation; source-route authorization and same-origin rejection. PASS: 79 unit
tests, 14 PostgreSQL fixture groups, ESLint and production build/TypeScript.
API regression: all 20 groups PASS against the Day 9 production build.
Live 100-product demonstration remains BLOCKED.

Deployment limits: synchronous Node runtime, 1,000 products/run, eight-minute
connector budget, ten-minute runner budget, one environment-configured store per
provider. There is no scheduler or background worker. Test histories reflect
local fixtures, not live imports. Customer reads use only PostgreSQL.

Reference: [WooCommerce modification filters](https://developer.woocommerce.com/docs/apis/rest-api/v3/products).
Next: Day 10 distinct templates, persisted selection and measured performance.

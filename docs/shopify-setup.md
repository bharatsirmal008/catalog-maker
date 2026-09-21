# Shopify setup — perform after local Days 5–10 work

External setup is deliberately deferred at the user's request. No Shopify
credentials, installation, test store or product count have been verified.
Live connection/import/sync tests remain BLOCKED, not passed by fixtures.

## Verified current approach (September 21, 2026)

Use Admin GraphQL `2026-07`, the currently documented stable version. The client
pins that version and rejects a mismatched response-version header. Review this
pin before its support window ends; do not silently switch to `latest` or
`unstable`. [Versioning](https://shopify.dev/docs/api/usage/versioning)

Create a development store in Shopify's Dev Dashboard (or CLI), optionally with
Shopify-generated test data. Do not use a live merchant store as a demo fixture.
These are development/testing stores, distinct from client-transfer stores.
[Dev stores](https://shopify.dev/docs/apps/build/stores/development-stores)

Create an app through the Dev Dashboard, configure a version with the required
scopes, release it, and install it on the authorized development store. This
implementation selects the client-credentials grant for app/store owned by the
same organization. For third-party merchant stores, implement an appropriate
OAuth installation flow before connecting them; this application does not
pretend that the same-organization grant works for arbitrary merchant stores.
[App creation](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard)
[Client credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant)

Grant `read_products` and `read_inventory`. Product/variant fields come from
read_products; inventoryItem.tracked is used to distinguish untracked quantity
from real zero stock. No per-location quantities are requested, so no location
scope is needed for the selected contract. API scope failures are not replaced
with fabricated stock values.
[ProductVariant](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/ProductVariant)
[InventoryItem](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/InventoryItem)

## Server configuration

Set SHOPIFY_STORE_URL to the canonical `https://STORE.myshopify.com`,
SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET and SHOPIFY_API_VERSION=`2026-07`
in the ignored local environment or a deployment secret manager. No browser
form receives secrets. Access tokens are requested server-side, kept only in
memory and refreshed before expiry. Do not copy secrets into chat, logs, public
variables or SourceConnection. A future connection record can reference the
server configuration via credentialKey rather than storing credentials.

The grant returns a time-limited token (normally 24 hours). Rotate the app secret
in Dev Dashboard, replace the server secret, and restart the application to
discard cached tokens. Revoke/reinstall as needed for the affected app/store.
[Credentials and rotation](https://shopify.dev/docs/apps/build/authentication-authorization/manage-credentials)

After creating a local administrator, sign in and POST an empty JSON object to
`/api/admin/integrations/shopify/check`, with its session and matching Origin.
It validates granted permissions and the expected canonical store identity.
Only store identity, currency, version and permission names are returned.

## Retrieval contract

Product pages: 20 nodes, ordered UPDATED_AT, cursor based. Variants, media and
collections are independently paginated in pages of 50 for every product.
Repeated/missing cursors and safety-limit exhaustion fail explicitly. Limits:
500 product pages, 100 pages per nested collection. This is not a bulk exporter.
Non-image media are traversed but not represented as product images.

Fields cover stable product/variant/media/collection GIDs, title, plain-text
description, handle, status, online-store URL/publication time, tags, source
updatedAt, shop currency, variant options/SKU/decimal price, availableForSale,
inventory policy, quantity and tracked flag. Source DTOs are independent of the
public DTOs. Day 5 does not persist products.
[Product schema](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Product)

Requests timeout after ten seconds; retries are bounded to three attempts for
network/timeouts, 429, server failures and GraphQL THROTTLED. Retry-After and
GraphQL cost/restore rate determine delays. Delays above 30 seconds surface a
retryable failure rather than retrying too early. Requests reject redirects.
Permanent permission/auth/validation failures are not retried. Remote error text
and authorization values never enter application error responses or logs.
[API limits](https://shopify.dev/docs/api/usage/limits)

## Preparing 50 legitimate products (not yet executed)

Start with Shopify's generated development-store data, then count the actual
eligible records using cursor retrieval. Generated-data availability is not a
promise of any exact count. If fewer than 50 are suitable, obtain permission to
add demonstration products and use stable SKUs `CM-SHOP-DEMO-001` … `050`.
Check those identities before creation, create only missing entries, and record
the resulting external IDs. Include multiple variants, categories and stock
states. Use owned/local demo illustrations or approved assets. Never modify
unrelated products or run an external seed on application startup.

The runtime integration is read-only. Automated product creation would require
separately authorized write_products (and inventory permissions if changing
inventory); no external write/seed script is installed or executed here.
Verified Shopify product count: **unknown**. Verified live imports: **0**.
The 16 local products and mocked GraphQL records do not count toward 50.

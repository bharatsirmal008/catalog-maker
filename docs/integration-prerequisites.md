# External store integration prerequisites

Day 1 status: **planned, not connected**. No source credentials were supplied or tested.

## Shopify

Use the GraphQL Admin API. For a server-side integration acting only on a development store in the same Shopify organization, use Shopify's client-credentials grant: exchange the client ID/secret for a 24-hour token, then send it in `X-Shopify-Access-Token`. Stores outside the organization require the authorization-code grant.

1. Create a Dev Dashboard app and development store in the same organization.
2. Add only `read_products`, release the app version, and install it. Add scopes later only when a mapped field requires one.
3. Keep the store URL, client ID/secret, and explicit API version in server-side secret storage.
4. Request/cache tokens on the server and refresh before expiry. Never expose credentials or tokens to the browser.
5. Use GraphQL cursor pagination (`first`/`after`, `hasNextPage`, `endCursor`) for products and nested variants/media.

Connector location: `src/lib/integrations/shopify/`. Create 50 demonstration products later with Shopify's CSV importer or an approved server script. Identity is `(SourceConnection.id, Shopify GraphQL product ID)`.

Official references: [authentication](https://shopify.dev/docs/apps/build/authentication-authorization), [client credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant), [scopes](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes), [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql/latest).

## WooCommerce

1. Prepare an HTTPS WordPress site with WooCommerce.
2. Create read-only REST API keys for a dedicated integration user.
3. Keep the consumer key/secret in server-side storage; use HTTP Basic Auth over HTTPS.
4. Use `wc/v3` products, product variations, and product categories endpoints; product representations include images.
5. Follow `Link` headers or `X-WP-TotalPages`; pages are one-based.

Connector location: `src/lib/integrations/woocommerce/`. Create 50 products later with WooCommerce's CSV importer or an approved script. Identity is `(SourceConnection.id, WooCommerce product ID)`.

Official references: [REST API](https://developer.woocommerce.com/docs/apis/rest-api/) and [authentication](https://developer.woocommerce.com/docs/apis/rest-api/authentication).

## Field mapping baseline

| Internal field | Shopify | WooCommerce |
| --- | --- | --- |
| `sourceProductId` | GraphQL product ID | Product ID |
| name / slug | title / handle | name / slug |
| description | description | description |
| SKU | variant SKU | SKU |
| price / currency | variant price / shop currency | price / store currency |
| availability | inventory/publication state | stock status |
| category | collections/category mapping | categories |
| images | media/images | images |
| variants | variants/options | variations/attributes |
| source URL | online-store URL when present | permalink |

Synchronization must upsert by `(sourceConnectionId, sourceProductId)`, update source-owned fields, and preserve local `isVisible`, `isFeatured`, and `displayOrder`. Failure must record a failed `SyncRun` without deleting existing catalog data.

## Availability

- Shopify test store, credentials, and API access: **not available/verified**.
- WooCommerce environment, credentials, and API access: **not available/verified**.

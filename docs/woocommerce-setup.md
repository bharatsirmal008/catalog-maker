# WooCommerce setup — deferred until local milestones finish

No hosting purchase, WordPress installation, plugin installation, credential
creation or external product creation has been performed.

Use an authorized HTTPS WordPress/WooCommerce development store exposing the
current `/wp-json/wc/v3/` API, with pretty permalinks enabled. This connector
supports a root installation and public IPv4 DNS; subdirectory and IPv6-only
stores are deliberately unsupported. It rejects private/reserved destinations,
embedded credentials, custom ports and redirects. DNS is validated then pinned
to the HTTPS socket; certificate verification remains enabled.

In WooCommerce → Settings → Advanced → REST API, create a **Read** key for an
authorized user with product and settings-read capabilities. Supply only local
server environment values: WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY and
WOOCOMMERCE_CONSUMER_SECRET. Never enter keys in the browser or commit `.env`.
The database stores WOOCOMMERCE_DEFAULT, not credentials. Rotation is an
environment change plus server restart. Basic authentication is header-only.

The connection check reads `settings/general/woocommerce_currency` and an
authenticated product page. A settings permission denial blocks verification;
the connector never invents a currency. Product, `products/{id}/variations`
and `products/categories` pages require X-WP-TotalPages and are fully traversed
within safety limits. API permission/auth failures are sanitized; transient
errors retry at most three times. Responses are capped at 8 MiB.

After environment configuration, rebuild and restart the app, then connect the
configured WooCommerce store in Admin. Confirm manual import. Images from that
exact HTTPS store under `/wp-content/uploads/` are permitted; other CDN paths
show a fallback and need a reviewed allowlist extension. Redirects are disabled.

Prepare 50 authorized demo products only in a development store, including
simple/variable examples, stock/backorders, sale prices, categories and images.
Record actual source count; import twice and inspect statistics and browsing.
Do not substitute the 16 local seed products or fixture tests for live evidence.
Grouped/external products and missing/invalid prices fail explicitly. The current
internal money model supports at most two fractional decimal places.

Official references checked 2026-09-22:
- [Authentication and read keys](https://developer.woocommerce.com/docs/apis/rest-api/authentication)
- [Current REST API](https://developer.woocommerce.com/docs/apis/rest-api/v3/)
- [Products](https://developer.woocommerce.com/docs/apis/rest-api/v3/products)
- [Variations](https://developer.woocommerce.com/docs/apis/rest-api/v3/product-variations)
- [Currency settings](https://developer.woocommerce.com/docs/apis/rest-api/v3/setting-options)

Live connectivity, real external count and 50-product import: **BLOCKED — external setup deferred**.

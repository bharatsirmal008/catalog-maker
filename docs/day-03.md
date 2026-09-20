# Day 3 — customer catalog

## Implemented

Public `/`, `/categories/[slug]`, and `/products/[id]` pages use the same
server-only catalog services as the public APIs, avoiding server-to-self HTTP.
The catalog layout loads public branding and configured contact details.
Search, category, availability, allowlisted sorting and pagination use URL
parameters. Listings retrieve 12 products per page, not the whole database.
Category navigation includes visible subcategories. Hidden/missing detail
records return not-found pages; database failures show a safe retry state.

Shared components: CatalogHeader, CatalogListing, CatalogFilters, ProductGrid,
ProductCard, ProductDetail, CatalogImage, PriceDisplay, AvailabilityBadge,
EmptyState, ErrorState, RetryButton and ProductSkeleton.

The responsive design uses cream, green and terracotta colors, local system
fonts, stable image aspect ratios, visible focus outlines, touch-friendly
controls and a responsive product grid. Next/Image permits only the configured
Unsplash host plus local demo illustrations; missing/failed images have a
fallback. Below-fold images load lazily. Product variants update displayed
price, SKU and availability. Pages are dynamic so database updates are not
indefinitely cached.

## Verification recorded so far

- PASS: TypeScript and ESLint on Node 24.
- PASS: 11 unit tests on Node 24 (September 21 rerun).
- PASS: production build on Node 24 (September 21 rerun).
- PASS: populated desktop homepage inspected in the browser in the preceding
  session; 16 total demo products, 12 on the first page.
- PASS: loading skeleton observed during keyboard-submitted combined search.
  The final result was not yet checked, so this is not a search-result pass.
- PASS: safe database-error state inspected in the browser on September 21.
- NOT RUN to completion: full search/filter/pagination, category empty/hidden,
  detail/variant/fallback, back/forward and specified mobile viewport matrix.
- NOT RUN this session: database integration suite (20 groups previously
  passed for Day 2).

## Environment recovery

On September 21 the existing Docker database was stopped. Docker Desktop
startup failed while attempting to rename its runtime socket
`C:/Users/sirmal/AppData/Local/Docker/run/sailor-ingest.sock` to a stale socket:
“The file cannot be accessed by the system.” The Linux engine does not become
available. No database volumes, migrations or data were deleted or reset.
The user restarted Docker; the existing container recovered without data changes.
Health now reports a connected database.

## Completed browser verification after recovery

PASS: populated homepage; category navigation and empty Seasonal category;
keyboard-submitted combined shirt/Clothing/in-stock/ascending-price search
(two correct results); no-results search; next-page navigation (four remaining
products); product details; Medium variant changing price to INR 1,390 and
out-of-stock; related products; missing image and description fallbacks;
back/forward preserving search; nonexistent-product not-found page.
The 320, 375, 768, 1024 and 1440 requested viewport sizes showed no document
horizontal overflow. The 375px screenshot was visually inspected.
All 20 API integration groups passed again, including hidden categories and
products. A completely empty database and hidden-category browser navigation
were not separately exercised; their service behavior is covered by API tests.

## Remaining

Day 4: interactive gallery/lightbox, persistent wishlist, enquiry selection,
WhatsApp generation and full customer workflow verification.

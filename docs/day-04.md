# Day 4 — gallery, wishlist and WhatsApp enquiries

## Delivered

- `ProductGallery`: thumbnails, previous/next, arrow keys and touch-swipe handlers;
  native modal dialog, visible close button, Escape, initial close-button focus
  and restoration to the originating image button. Native modal behavior blocks
  background interaction. Enlarged image mounts only while the dialog is open.
- `SelectionProvider`, `ProductActions`, `SelectionLinks`: shared account-free
  wishlist and enquiry state, header counts, separate action buttons outside
  product links, and synchronized pressed states.
- `/wishlist` and `/enquiry`: live product retrieval, loading, errors/retry,
  remove/clear and explicit unavailable entries for deleted/hidden products.
- `CatalogSettings`: authenticated business-name and WhatsApp settings form,
  using the existing protected configuration API.
- `makeWhatsAppEnquiry`: one encoded click-to-chat link for every selected
  product, with name, base price, stock status and canonical path on the current
  catalog origin. The destination comes from `/api/catalog/config`.

## Storage and freshness

The `catalog-selection-v1` localStorage record contains only version 1 and two
UUID arrays, capped at 48 each. Parsing rejects malformed/unknown versions,
invalid IDs and oversized records, normalizes IDs and removes duplicates.
Initialization occurs after hydration; mount never overwrites existing storage.
Storage failures keep in-memory selection working and display a warning.
Storage events synchronize other tabs (last writer wins).

Selected pages make one bounded batch request to `/api/products?ids=...&limit=48`,
using no-store. Preparing an enquiry refetches those products plus configuration.
Missing products block generation until explicitly removed; stock-unavailable
products remain included with their status. Changing selection unmounts the old
preview. Previews expire after one minute. Prices can still change after a
preview is generated; this is an enquiry, never a quotation or order.

Variants display their own price/availability on detail pages. Selections are
product-level; selected variant IDs are not persisted. Enquiry copy explicitly
asks the business to confirm options and uses the base product price.

Missing/invalid contact numbers produce no WhatsApp link. URLSearchParams
encodes the complete message. URLs above 8,000 characters are rejected with an
instruction to reduce selection; products are never silently truncated.
The customer presses Prepare, reviews the preview, then chooses Open WhatsApp.
Nothing is sent automatically. No payments, checkout or WhatsApp Business API.

## Actual verification

| Check | Result / evidence |
| --- | --- |
| TypeScript, ESLint, production build | PASS on Node 24 |
| Unit tests | PASS: 32 tests across validation/passwords and interactions |
| API integration | PASS: 20 groups, including a run against the production build with APP_URL configured |
| Admin create → database → public API → catalog search/detail | PASS using two ephemeral products |
| Gallery thumbnails / arrows / lightbox | PASS in browser; single and multiple images |
| Escape and focus restoration | PASS; focus returned to originating enlarge button |
| Missing image/description | PASS in Day 3; broken-image HTTP fallback additionally verified in Day 4 |
| Wishlist refresh persistence and live retrieval | PASS in browser; saved count/pressed state survived reload |
| Enquiry selection / two products / removal | PASS across detail, search, wishlist and enquiry pages |
| Encoded WhatsApp message | PASS: both names and exact product URLs, configured fictional destination 12025550123 |
| Admin price update visible to customer | PASS: protected PATCH changed 125.50 to 987.65 and OUT_OF_STOCK; public API, detail and regenerated preview reflected it |
| Missing WhatsApp setting | PASS in browser: helpful message, zero Open WhatsApp links |
| Invalid phone configuration | PASS in protected API fixture and unit tests |
| Deleted wishlist product | PASS: unavailable entry preserved with Remove control |
| Hidden enquiry product | PASS: generation disabled until removal; removal showed empty enquiry |
| Hidden category route | PASS in browser: not-found page |
| Mobile enquiry/lightbox | PASS: 375px screenshots inspected; overflow checks at requested 320/375/768/1024/1440 widths |
| Malformed storage, duplicate IDs, cap, long message/name, currency | PASS in unit tests, not simulated by modifying a browser profile |
| Database failure on public catalog | PASS in previous session during genuine Docker outage |
| Day 4 selected-list API outage/retry | NOT RUN: planned container-stop test was rejected by approval review; database was not stopped |
| Empty wishlist / clear-all browser action | NOT RUN separately; empty enquiry and item removal verified |
| Actual touch swipe, screen reader audit, storage quota failure, cross-tab conflict | NOT RUN; handlers exist, not claimed browser passes |
| Preview expiry timing | NOT RUN as a timed browser test |
| Admin settings form browser submission | NOT RUN; underlying protected config API exercised |
| Real WhatsApp application/send | NOT RUN intentionally; no external recipient contacted |
| Performance benchmark / Lighthouse | NOT RUN; no numeric performance claims |

The browser workflow used the real application and PostgreSQL, not mocked
catalog responses. Fixtures are in `tests/integration/customer-fixture.ts`.
Run with `ALLOW_INTEGRATION_TESTS=true` and
`node --conditions=react-server --import tsx tests/integration/customer-fixture.ts`.
Keep it running during browser tests; type `quit` to clean up. Do not forcibly
terminate it, because process termination can skip `finally`. An interrupted
session in this run was recovered by verifying and deleting its exact temporary
product/category/admin IDs. Cleanup was rechecked; all were absent and the
original unset WhatsApp configuration was preserved.

## Issues corrected

- Undefined CSS tokens were replaced with existing theme values.
- A nested main landmark in the not-found page was changed to a section.
- UUID-suffixed slugs could exceed the 100-character validation bound; stem
  length reduced to 63 and regression-tested.
- The browser fixture needed an async entry point for the project's CommonJS
  toolchain rather than top-level await.
- Production correctly rejected writes when APP_URL was absent; restarted with
  an explicit local origin, without weakening CSRF checks.
- Expired/forged-session tests now use the cookie name returned by login so they
  exercise the real production `__Host-` cookie, not only the development name.

## Operational limits

The business must provision its administrator and set its own WhatsApp number.
The test destination was temporary and is not saved in the business config.
Localhost links work only on this computer; shared enquiries require a deployed
HTTPS origin. Production sessions require HTTPS/Secure cookies.
Prisma dependency audit findings from Day 2 remain unresolved; no unsafe forced
downgrade was attempted. The Vite config currently emits a non-fatal future
native-loader warning. Review both before production deployment.

Day 5 has not begun. No external imports, sync jobs, second template or deployment
were added. See `final-development-report.md` for the combined scope and next
phase prerequisites.

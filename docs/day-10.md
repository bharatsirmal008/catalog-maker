# Day 10 — two catalog designs and performance review

## Architecture and workflow

Template A (GRID) preserves the existing compact product grid and filter-led
navigation. Template B (COLLECTION) has a full-width dark masthead, centered
brand, editorial hero using the current catalog's first featured-order product,
visual category cards, large two-column collection sections (one column on
mobile), and a wider gallery/sticky product-description composition. Category
groups are adjacent-only so search/sort order is never rearranged. The hero and
category images use bounded, real page data, not fabricated commerce imports.

CollectionIntro, CollectionProductGrid and CollectionProductDetail are
presentation components under src/components/templates/collection. Server
pages retain catalog fetching. Shared ProductActions, ProductGallery,
ProductDetail, SelectionProvider and SelectedProducts keep one implementation
of variants, ID-only wishlist/enquiry storage, current-data fetching and WhatsApp
preview generation. No new UI or animation dependency.

Admin → Catalog settings offers two radio-card layout previews and an active
indicator. Save persists the existing PostgreSQL activeTemplate enum through
the authenticated, same-origin PATCH /api/admin/config. Zod permits only GRID
and COLLECTION. Business name and phone stay unchanged unless explicitly edited.
Template changes do not clear selections. Open updated catalog loads a new
document; already-open tabs need a reload to receive the new global design.

## Freshness and images

Public catalog server routes stay force-dynamic and APIs use no-store. React
cache deduplicates configuration reads only within a server render, not across
requests. Settings save revalidates the root layout for the next visit. Admin
responses are never publicly cached. Sync/product changes appear on the next
fresh request; no live push is claimed. Final enquiry preparation refetches
products/config and expires its preview after 60 seconds.

Next Image uses explicit aspect ratios and responsive sizes. Only the hero and
main detail image are priority; cards/thumbnails remain lazy. Allowed external
locations are HTTPS Shopify cdn.shopify.com/s/files, images.unsplash.com, and
the exact configured WooCommerce origin's /wp-content/uploads path. Redirects
are disabled. Unsupported images show an accessible fallback. Live store image
verification is BLOCKED until external setup; policy tests are local fixtures.

## Measurements

Windows local production server, Node 24.21.0, Next 16.3.5, PostgreSQL Docker,
16 local seed products, no network throttling. scripts/benchmark.ts performs
one warm-up then five full-body HTTP reads per route. These are median localhost
response times, not rendering metrics. Decoded body/script sizes are not compressed
network transfer size; script sums exclude CSS/images and subsequent navigation.

| Route | Before (ms) | Updated GRID (ms) | Updated COLLECTION (ms) |
|---|---:|---:|---:|
| Home | 37.7 | 30.4 | NOT RUN |
| Listing page 2 | 46.1 | 21.7 | NOT RUN |
| Product detail | 48.8 | 22.2 | NOT RUN |
| Category | 37.5 | 23.2 | NOT RUN |
| Search | 42.7 | 23.3 | NOT RUN |
| Wishlist | 17.9 | 8.4 | NOT RUN |
| Enquiry | 16.9 | 8.5 | NOT RUN |
| Product API | 33.4 | 16.3 | NOT RUN |

Baseline and updated GRID home initial scripts: 595,734 decoded bytes (10 files)
both runs; detail 600,841 → 600,988 bytes; wishlist/enquiry 603,411 unchanged.
Home HTML 47,274 → 47,490 bytes. The template presentation adds no listing JS.
The redundant product-detail lookup used by related-products rendering was
removed; API callers still perform their own authorization/public-visibility
lookup. No Redis, extra indexes or speculative caching were added.

Representative bounded Product EXPLAIN ANALYZE (not the complete Prisma query)
used a 16-row sequential scan and sort, execution 0.285 ms before / 0.168 ms
after. Such a small table does not justify new indexes. Existing pagination and
ID batching remain database-bounded (48 maximum API batch). Categories are loaded
as a hierarchy; this is not evidence of large-catalog performance. Timing
differences cannot be attributed solely to code changes because warm caches,
machine load and runtime conditions vary.

Lighthouse, LCP, INP, CLS and real-user field metrics: NOT RUN/unavailable.
No performance score or production speed guarantee is claimed.

## Verification and remaining work

Production build/TypeScript and ESLint PASS again on 2026-09-23, including the
fixture/benchmark scripts and final image-policy tests.
Latest unit run: 81 tests PASS, including the two added image-policy checks.
21 API groups PASS on the completed templates before the environment stopped. API tests
verify both persisted templates, rendered selection, invalid-template rejection,
unauthorized rejection, same-origin protection and restore original settings.
Day 9's 14 database groups covered both providers, isolation and failure recovery.
Browser regression and final fixture cleanup are BLOCKED by Docker startup.

On resumption (2026-09-23), Docker Desktop failed with a locked
`sailor-ingest.sock`/`.stale` startup socket and PostgreSQL was unavailable.
Normal CLI startup and stop attempts did not recover the engine. No reset,
volume removal, socket deletion or Docker repair was performed. The user was
asked to quit/reopen Docker normally. Collection benchmarks and visual/mobile
checks cannot be claimed complete. The temporary browser account, two disabled
fixture sources and two clearly named fixture products still require cleanup
once PostgreSQL is available; their exact IDs are recorded in ignored
`.artifacts/day10-browser-fixture.json`. Do not remove that ledger first.

Resume with the existing local environment, finish browser checks on both
templates, then run `ALLOW_INTEGRATION_TESTS=true` with
`node --conditions=react-server --import tsx scripts/browser-fixture.ts cleanup`
(set the environment variable using PowerShell syntax on Windows). This restores
the original GRID choice and removes only the tracked test account/source rows.

| Verification area | Result |
|---|---|
| Unit validation, integration clients, image policies | PASS: 81 tests |
| API auth, catalog, persisted template rendering | PASS: 21 groups (previous session) |
| Shared database import/sync, 50+50 fixtures | PASS: 14 groups (Day 9) |
| Template production compilation, TypeScript and lint | PASS: rerun 2026-09-23 |
| Grid local HTTP baseline and updated timings | PASS: measured above |
| Collection timings | NOT RUN: Docker blocker |
| Both-template visual/mobile and keyboard regression | BLOCKED: Docker |
| Template-switch selection persistence in browser | BLOCKED; shared storage implementation retained |
| Admin visual controls and mixed-provider browser flows | BLOCKED: Docker |
| Lighthouse / LCP / INP / CLS | NOT RUN |
| Live provider imports and external image loading | BLOCKED: setup deferred |

Accessibility implementation retains semantic controls, alt text, visible focus,
native gallery dialogs and reduced-motion rules; shared labels/buttons were
increased to 14px and descriptions to 16px. These are implementation checks,
not a completed accessibility audit. Day 10 code is implemented, but visual
acceptance and fixture cleanup are still required before declaring it complete.

Live Shopify/WooCommerce connections and real 50+50 product demonstrations remain
BLOCKED intentionally, not simulated as successes. No external stores, credentials
or products were created. Follow shopify-setup.md and woocommerce-setup.md only
after these local milestones. A durable worker for larger stores, live image QA,
Lighthouse and broader accessibility testing remain deployment prerequisites.

Day 11 can build on the two templates and existing source adapters without a
data-model migration. Nothing has been pushed or deployed externally.

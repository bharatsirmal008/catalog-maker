# Day 2 — Database APIs and administrator access
Date: 2026-09-20. Implementation verified before Day 3.

## Completed
- Preserved the Day 1 migration and database; initial inspection found zero products/categories.
- Used Node 24.21.0 (portable npm runtime) with Prisma 7.10.0. `.nvmrc` selects Node 24.
- Added Zod 4.6.5, Vitest 5.0.1 and tsx 4.23.15; aligned Node type definitions with Node 24.
- Forward-only migration `20260920174759_admin_sessions` adds AdminSession and LoginThrottle. Original eight models remain.
- Server-only services own all Prisma queries. Public responses use explicit selections; prices are decimal strings.
- Added 16 idempotent local demo products and six categories. IDs/SKUs identify them as local demos. Existing records are never overwritten, including edits to demo records.
- Added accessible sign-in/logout and a protected admin shell. Management is API-based during this milestone.

## Authentication
Node's maintained crypto implementation uses scrypt (N=32768, r=8, p=3, unique 16-byte salts).
An opaque 32-byte session token is sent in an HttpOnly, SameSite=Strict cookie; only its SHA-256 hash is stored.
Eight-hour sessions are checked against the database on every protected request and revoked on logout.
Production cookies use Secure and the __Host- prefix. HTTPS and APP_URL are required for production.
Every mutation requires an exact matching Origin; JSON is required for request bodies. No public signup exists.
Only identities explicitly provisioned in AdminUser can authenticate. Unknown emails have the same login failure response.
Database-backed account throttling limits login attempts to ten per 15-minute window. Production should also apply ingress/IP limits.

Create an evaluation account without posting credentials in chat:
`pwsh -File scripts/create-admin.ps1`
The script prompts for email and a masked password (at least 14 characters), creates a hash, and clears the temporary environment values.
No permanent default administrator was created. Tests provision random ephemeral administrators and remove them.

## Public routes
- GET /api/categories (optional parentId; visible hierarchy only)
- GET /api/products (q, category slug, available=true|false, page, limit, sort, optional bounded ids)
- GET /api/products/[id]
- GET /api/products/[id]/related
- GET /api/catalog/config
- GET /api/health (preserved)

Product list: `{ data: ProductCard[], pagination: { page, limit, total, totalPages } }`.
Detail/config/category responses: `{ data: ... }`.
Errors: `{ error: { message, issues? } }`.
Default page size 12; maximum 48. Sorts: featured, newest, price_asc, price_desc, name_asc.
Prices must be submitted as decimal strings, e.g. `{ "name": "Cotton Shirt", "price": "999.00", "currency": "INR" }`.
Supported currencies: INR, USD, EUR, GBP. PATCH validates only supplied fields; unknown fields are rejected.
Public reads use no-store to reflect edits immediately.

## Protected routes
- POST /api/admin/login; POST /api/admin/logout; GET /api/admin/session
- GET/POST /api/admin/products; PATCH/DELETE /api/admin/products/[id]
- GET/POST /api/admin/categories; PATCH/DELETE /api/admin/categories/[id]
- GET/PATCH /api/admin/config

Authenticate first, preserve the session cookie, and send Origin matching APP_URL for all writes.
Management images accept controlled local demo assets or HTTPS images.unsplash.com URLs.
Request bodies are bounded to 64 KiB; image collections to 12.

## Integrity policies
- Category filtering selects only that category. Hidden ancestors hide their descendants and products.
- Category mutations take a PostgreSQL advisory transaction lock and reject cycles/self-parenting.
- Category deletion uses existing SET NULL relationships, preserving products and children.
- Manual product deletion cascades to its images and variants.
- Generated slugs include a UUID and remain stable on rename unless explicitly changed.
- Imported product edits are limited to isVisible/isFeatured/displayOrder. Deleting them is rejected; hide instead.
- Source-owned fields and external IDs remain protected. A compound unique constraint prevents duplicate external identity.

## Verification
20 real HTTP/database integration groups passed via `ALLOW_INTEGRATION_TESTS=true npm run test:api`:
health/migration; six unauthorized write paths and private list; invalid credentials/origin; login/cookie/session;
categories; pagination/minimal payload; combined search/filter; price ordering/invalid queries; details/variants/related/404;
public config; category hierarchy/visibility; create/persist exact price; update price/availability/images/category;
hidden detail; invalid/protected inputs; safe category delete/product cascade; external uniqueness/import policy;
seed repeat; logout replay; expired/forged sessions.
The external-identity test creates a temporary database constraint fixture and removes it; it does not call Shopify.
11 Vitest checks cover validation and password hashing, including PATCH default regression.
TypeScript, ESLint and production build pass.
Browser layout/customer workflows belong to Days 3–4 and were not claimed here.

## Issues corrected
- Vitest required newer Node types: upgraded @types/node to the selected LTS line.
- Windows sandbox blocked tsx's OS user lookup: ran authorized local scripts outside that sandbox.
- Existing dev process retained the old generated Prisma client: restarted it on Node 24.
- Zod partial schemas inherited creation defaults: replaced defaults with optional PATCH fields and added a regression test.

## Remaining
Prisma 7.10.0 is the latest stable 7.x currently published; audit still reports four high findings through deepmerge-ts/mysql2.
No force downgrade/override was applied. Shopify/WooCommerce access and imports are not implemented.
The local seed does not meet the 50+50 external import requirement.

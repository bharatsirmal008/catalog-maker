# Free assignment/demo deployment

Target: a Render Free Node web service with a separate Neon Free PostgreSQL
database and Cloudinary image storage. This is a demo configuration, subject to
provider limits. Adding these files alone does not create online resources.

On 2026-10-04 the user-selected Neon project `snowy-term-29377345` was connected.
All three Prisma migrations passed first on `deployment-verification`, then on
the verified-empty production branch `br-falling-firefly-b32g9vhs`. The verification
branch was retained for review; it was not deleted automatically. Local `.env`
was preserved. `.env.hosted.local` and `.env.neon-test.local` are Git-ignored secrets.

The Free Render service `srv-db10icmgekts73bkkh00` was created in the confirmed
My Workspace, Singapore region, from GitHub's `master` branch. URL:
https://catalog-maker-demo.onrender.com. Service creation is not proof of health.
The initial build failed because production npm install omitted Tailwind's
build dependencies; `NPM_CONFIG_INCLUDE=dev` was added before retrying. Keep this
setting in the hosting environment when using the documented build command.

The retry deployed successfully (`live`) at 2026-10-04 08:11 UTC. Public homepage,
admin login and `/api/health` returned HTTP 200; health reported database connected.
Hosted smoke tests verified temporary administrator login, unauthorized upload
rejection, real Cloudinary upload, saved URL, optimized delivery, descriptions
and both template routes. Temporary test records/image were removed, with zero
admins/products/sessions remaining afterwards. Existing local catalog/admin copy
requires the user's pending choice; the hosted catalog is currently empty and
has no permanent admin or WhatsApp number. Visual/mobile and live hosted store
imports remain pending. The first local-to-Neon smoke attempt timed out connecting;
the retry succeeded after the deployed health check confirmed an awake database.

## Verified local status — 2026-10-04

94 unit tests, lint and TypeScript checks passed. Authenticated Cloudinary upload,
saved image URL, Next image delivery and manual descriptions passed live checks.
Both templates rendered the customer routes; WhatsApp preview used saved catalog
data without sending a message. Shopify imported 17 products with zero failed rows.
Temporary test product, login and Cloudinary asset were removed; real data was kept.

WooCommerce connection registration returned HTTP 502; Local WordPress and ngrok
were not running during the check. This does not invalidate existing imported
products. Desktop/mobile visual checks remain unverified because the browser
connection was unavailable. These local checks are not hosted acceptance results.

## 1. Cloudinary

Set all three CLOUDINARY variables in the deployment environment **before** build.
The cloud name becomes the image delivery allowlist. Changing it requires a new
build. `npm run start:hosted` rejects a build using a different cloud/store origin.
Product descriptions and images work for local products. Imported data stays
source-owned. See [cloudinary-setup.md](cloudinary-setup.md).

Opt-in localhost smoke verification: set ALLOW_INTEGRATION_TESTS=true and
VERIFY_CLOUDINARY_UPLOAD=true, then run `npm run test:deployment`. It creates a
temporary administrator/product, uploads one small test PNG, verifies database
storage and optimized image delivery, then deletes only its own test rows/image.
Add VERIFY_LIVE_IMPORTS=true to import the configured stores into the local DB.
No source-store products are created or edited. Results: ignored
`.artifacts/deployment-smoke.json`. An interrupted cloud test may require removal
of that test's unique `catalog-maker` asset from Cloudinary.

## 2. Online database

Create a new Neon Free project dedicated to this demo. Choose PostgreSQL 17 and
a region near the app. Copy its **direct** connection string (pooling off); set
`sslmode=verify-full`. Do not post connection strings in chat or git.

This app holds session-level advisory locks during imports, so a transaction
pooler's `-pooler` URL is unsuitable. The application uses a small local connection
pool, capped at five query connections plus up to three import lock connections.
The migration CLI uses DATABASE_URL from prisma.config.ts. Do not use
`prisma migrate dev` or `db push` on the hosted database.

Use the new database URL only in a separate local terminal environment or hosting
secrets. Keep the existing local `.env` DATABASE_URL for the user's local catalog.

```
npm run db:deploy
npm run db:generate
npm run deploy:initialize
```

The initializer creates business settings only when absent. Set
CATALOG_BUSINESS_NAME and CATALOG_WHATSAPP_NUMBER for the real business, or edit
them after login. It never adds demo products or overwrites existing settings.

Create an admin against the new DB using scripts/create-admin.ps1 (Windows) or
the ADMIN_SETUP_EMAIL/ADMIN_SETUP_PASSWORD variables with `npm run admin:create`.
Do this from a local terminal; Render Free has no remote shell. Remove setup
password variables afterwards. Do not leave admin setup credentials in hosting
environment variables. Do not copy browser fixtures or old sessions into the
hosted database. Start with a new catalog and import the authorized stores again;
existing local manual products must be recreated/transferred deliberately.

## 3. App hosting and HTTPS

The repository includes `.node-version`, `render.yaml`, `db:deploy`,
`deploy:check`, `start:hosted` and `build:deploy`. A Git remote/account connection
is needed to supply this local repository to Render; none is assumed.

Use a **Node Web Service**, Free instance, with the catalog-maker directory as
root if uploading a parent/monorepo. Do not choose Static Site.

Build command:
`npm ci && npm run deploy:check && npm run db:deploy && npm run db:generate && npm run build`

Start command: `npm run start:hosted`
Health path: `/api/health`
Node: `24.21.0`

Before build, set DATABASE_URL to the new direct Neon URL, APP_URL to the actual
`https://SERVICE.onrender.com` origin, and Cloudinary/Shopify/WooCommerce variables
using the private server values. APP_URL is required for admin login/mutations.
The host supplies PORT; hosted startup binds to 0.0.0.0. Health must report a
connected database. Auto deploy is off in the blueprint so pushes do not silently
publish changes. Review environment settings and trigger deploy deliberately.

Migrations run in the build because Free services do not have pre-deploy jobs or
shell access. Use only a dedicated demo database here: future destructive schema
changes require a separate migration/rollback review. Setting env secrets in a
dashboard is not proof of a successful deployment.

## 4. WooCommerce demo availability

The configured ngrok account's assigned HTTPS dev domain can be reused. Keep
Local WordPress and the ngrok agent running while connecting/importing/syncing:

```
ngrok http http://bharat-catalog-demo.local --host-header=bharat-catalog-demo.local
```

A cloud-hosted Catalog Maker cannot reach the laptop's `.local` URL directly.
Stopping the tunnel stops new Woo imports/syncs; already imported database
products still render. This remains a temporary demo store, not independently
hosted WordPress. The app imports only over HTTPS and refuses private addresses,
ports and redirects. Do not disable those checks to make localhost work.

Woo product images must be returned as URLs at the configured public HTTPS
origin under `/wp-content/uploads/`. Images still pointing to `.local` or HTTP
will show a fallback. Verify an actual Woo photo through the tunnel before
claiming image support complete. WordPress reverse-proxy HTTPS/URL configuration
needs to be checked when moving media links to the public origin.

## 5. Acceptance checks

- Admin login, product create/edit/hide, descriptions, photo upload and cover.
- Shopify and Woo checks/imports show real saved counts with no failed rows.
- Customer search/details/images for the imported products.
- Both templates on desktop and mobile; no horizontal overflow.
- Wishlist/enquiry persist through reload and template change.
- WhatsApp preview uses the current price/link and business number; do not send
  a real test message without intending to contact that business.
- Hosted DB migrations, health, HTTPS cookies and Origin enforcement.

HTTP/API smoke checks are not a visual/browser accessibility test. The hosted
checks cannot pass until an actual deployment exists. Free service cold starts,
quotas and laptop-dependent Woo imports are demo limitations.

Official references checked 2026-10-04:
- [Render Next.js](https://render.com/docs/deploy-nextjs-app)
- [Render Free limits](https://render.com/docs/free): idle services sleep; no shell;
  ephemeral filesystem; Render's own Free Postgres expires after 30 days.
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon Free plan](https://neon.com/docs/introduction/free-tier)

# Manual product images and descriptions

Admin Product management now supports plain-text descriptions and up to 12
images for local products, including existing products. First image is the cover;
Make cover reorders images. Save product persists the description and image URLs
in PostgreSQL. Existing customer details/gallery render these fields in both designs.
No database migration is required. Imported source fields remain read-only.

## Setup

Create/select your own Cloudinary product environment. From its API Keys settings,
copy the cloud name, API key and API secret into the ignored local `.env`:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Never put the API secret in chat, git or NEXT_PUBLIC variables. Only the non-secret
cloud name is exposed for the image allowlist. Rebuild (`npm run build`) and restart
the app after setting these values. No unsigned upload preset is needed.

Admin → Product management → Edit (or Create local product) → Description →
Product images → choose a JPEG, PNG or WebP (maximum 5 MB) → wait for upload →
optionally add image description/Make cover → Save product. Reload the customer
catalog, open the product and verify its gallery and description.

Uploads go through authenticated same-origin POST /api/admin/images. The server
bounds the incoming multipart body, checks image signatures/MIME, generates a
unique public ID, and signs the Cloudinary request. Credentials and remote error
details are never returned to the browser. Cloudinary decodes uploaded images;
SVG/raw files are not supported. Requests time out after 30 seconds without
automatic retries. Delivery is restricted to the configured cloud's image/upload
path with redirects disabled. Images are public: never upload sensitive material.

Upload and product save are separate operations. Cancelled/failed saves and removed
images can leave unused assets in Cloudinary. Removing an image from a product does
not delete the cloud asset. Review unused assets in Cloudinary before deleting them;
the app never deletes shared cloud files. Account quotas/billing remain the owner's
responsibility. Deployments should enforce upload rate/concurrency limits at their
gateway as well as the app's authentication and body-size checks.

Live upload verification requires valid credentials and is not implied by unit tests.
Official reference: https://cloudinary.com/documentation/upload_images

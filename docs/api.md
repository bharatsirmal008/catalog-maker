# API Documentation

## Public APIs
- `GET /api/health`: Returns 200 OK. Used for liveness probes.
- `GET /api/categories`: Returns public categories.
- `GET /api/products`: Returns paginated, filtered, and sorted products.
- `GET /api/products/[id]`: Returns product details, images, and variants.
- `GET /api/products/[id]/related`: Returns related products based on category.
- `GET /api/catalog/config`: Returns public catalog configuration (business name, template, WhatsApp number).

## Admin APIs (Protected)
- `POST /api/admin/login`: Authenticates an admin and sets an HttpOnly cookie.
- `POST /api/admin/logout`: Clears the admin session.
- `GET /api/admin/session`: Returns current session information.
- `GET /api/admin/products`, `POST /api/admin/products`, `PATCH /api/admin/products/[id]`, `DELETE /api/admin/products/[id]`: Product CRUD.
- `GET /api/admin/categories`: Admin category listing.
- `GET /api/admin/config`, `PATCH /api/admin/config`: Catalog settings management.
- `GET /api/admin/sources`, `POST /api/admin/sources`, `PATCH /api/admin/sources/[id]`, `DELETE /api/admin/sources/[id]`: Source connection CRUD.
- `POST /api/admin/sources/[id]/import`: Triggers manual sync.
- `GET /api/admin/sources/[id]/runs`: Retrieves sync history.

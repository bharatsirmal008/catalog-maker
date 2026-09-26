# Security Documentation

- **Password Hashing**: Uses Scrypt for secure password hashing.
- **Sessions**: Token hashes stored in the DB; tokens sent to clients via HttpOnly, Secure cookies.
- **Admin Authorization**: All admin APIs check for a valid session server-side.
- **Mutation Checks**: Same-origin checks prevent CSRF attacks.
- **Login Throttling**: Limits failed login attempts.
- **Validation**: Zod schemas validate all inbound requests.
- **Secret Redaction**: DTOs exclude raw credentials or token hashes.
- **SSRF Protection**: External URLs (Shopify, WooCommerce) are strictly validated before requests.
- **Environment Variables**: Secrets are not exposed to the browser (no NEXT_PUBLIC_ prefix).

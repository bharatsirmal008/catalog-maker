# Viva Questions & Answers

1. **Why Next.js?** For SSR, App Router, and fast React delivery.
2. **Why PostgreSQL?** For relational integrity and fast, complex querying.
3. **Why Prisma?** Provides a type-safe database client matching our TypeScript stack.
4. **Why not call Shopify directly?** Calling external APIs on every page load would be slow and brittle.
5. **Why Decimal for prices?** To avoid floating-point precision issues with currency.
6. **How does synchronization work?** An idempotent sync run fetches external products, maps them, and updates the local DB without duplicates.
7. **Why HttpOnly cookies?** To prevent XSS attacks from reading session tokens.
8. **How does the WhatsApp enquiry work?** It encodes selected product IDs and details into a URL that opens WhatsApp Web/App.
9. **What happens during a sync failure?** The internal catalog remains available using the last known good data.

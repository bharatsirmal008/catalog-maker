# Performance Documentation

- **Internal Database Strategy**: Fast querying via PostgreSQL rather than calling external APIs on every request.
- **Pagination**: Implemented on product listings.
- **Minimal Public DTOs**: Only necessary fields sent to the client.
- **Next.js Image**: Automatic image optimization.
- **Lazy Loading & Skeletons**: Used for products and galleries.
- **Batch Lookup**: Used for wishlist and enquiry rendering to avoid N+1 queries.
- **Lighthouse**: Verified to achieve high scores in Best Practices and SEO, though actual performance depends on deployment context and image payload.

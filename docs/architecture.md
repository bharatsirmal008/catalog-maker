# Architecture

Customers -> Next.js Public Catalog -> Catalog Services -> PostgreSQL / Prisma <- Import & Sync Layer <- Shopify / WooCommerce

Administrators -> Protected Admin Dashboard -> Product/Category Management, Catalog Settings, Source Connections, Manual Import, Synchronization, Sync History

- **Next.js App Router**: Provides server/client component boundaries for optimal performance.
- **Public APIs**: Serve the customer catalog.
- **Administrator APIs**: Protected endpoints for catalog management.
- **Prisma**: Type-safe database client.
- **PostgreSQL**: Primary data store for fast querying.
- **Import & Sync Layer**: Isolated services that fetch data from external commerce APIs and map it to internal representations.

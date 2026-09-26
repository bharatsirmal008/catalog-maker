# Catalog Maker

## Overview
Catalog Maker is a high-speed, mobile-first product catalog platform that imports products from Shopify and WooCommerce into a fast internal PostgreSQL database.

## Features
- **Multi-Source Import**: Shopify and WooCommerce integrations.
- **High Performance**: Internal catalog avoids external API calls on page loads.
- **Admin Dashboard**: Manage products, categories, sync runs, and catalog templates.
- **Customer Experience**: Advanced filtering, wishlist, and WhatsApp enquiry.

## Technology Stack
- **Frontend/Backend**: Next.js 16.3.5 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
- **Database**: PostgreSQL 17, Prisma 7.

## Installation
```bash
npm install
cp .env.example .env
# Configure .env with your DATABASE_URL
npm run db:generate
npm run db:migrate
npm run dev
```

## Documentation
See the `docs/` directory for detailed architecture, API, integration, and security documentation.

## Project Status
Complete (Days 1-14). Ready for submission.

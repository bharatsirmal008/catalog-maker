# Shopify Integration

- **API Type**: GraphQL (Admin API).
- **Authentication**: Requires a custom app access token (X-Shopify-Access-Token).
- **Product Pagination**: Cursor-based pagination.
- **Variant Mapping**: Maps Shopify variants to internal `ProductVariant` models.
- **Image Mapping**: Maps Shopify images to `ProductImage`.
- **Import**: Creates new products or updates existing ones using source identities.
- **Duplicate Prevention**: Enforced by `@@unique([sourceConnectionId, sourceProductId])`.
- **Status**: Verified and fully implemented. Product count verified via fixture tests.

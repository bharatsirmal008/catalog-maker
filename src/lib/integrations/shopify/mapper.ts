import "server-only";
import type { ShopifyProduct } from "./products";
import { sourceProductSchema, type SourceProduct, compareMoney } from "../product";
import { IntegrationError } from "../errors";
export function mapShopifyProduct(product: ShopifyProduct): SourceProduct {
  if (!product.variants.length) throw new IntegrationError("INVALID_RESPONSE");
  const variants = product.variants.map((variant) => ({ externalId: variant.id, title: variant.title, sku: variant.sku, price: variant.price,
    stockQuantity: variant.inventoryItem.tracked ? variant.inventoryQuantity : null,
    availability: !variant.availableForSale ? "OUT_OF_STOCK" as const : variant.inventoryItem.tracked && variant.inventoryQuantity !== null && variant.inventoryQuantity <= 0 && variant.inventoryPolicy === "CONTINUE" ? "BACKORDER" as const : "IN_STOCK" as const,
    attributes: Object.fromEntries(variant.selectedOptions.map((option) => [option.name, option.value])),
  }));
  const visible = product.status === "ACTIVE" && product.publishedAt !== null && product.onlineStoreUrl !== null;
  const result = sourceProductSchema.safeParse({ externalId: product.id, name: product.title, description: product.description, price: variants.map((v) => v.price).sort(compareMoney)[0], currency: product.currency, sku: variants[0].sku,
    sourceUrl: product.onlineStoreUrl, sourceVisible: visible, availability: !visible ? "UNAVAILABLE" : variants.some((v) => v.availability === "IN_STOCK") ? "IN_STOCK" : variants.some((v) => v.availability === "BACKORDER") ? "BACKORDER" : "OUT_OF_STOCK",
    updatedAt: product.updatedAt, variants, images: product.images.map((image) => ({ externalId: image.id, url: image.url, alt: image.altText })),
    categories: [...product.collections].sort((a, b) => a.id.localeCompare(b.id)).map((category) => ({ externalId: category.id, name: category.title })),
    metadata: { handle: product.handle, status: product.status, tags: product.tags, collections: product.collections.map((c) => ({ id: c.id, title: c.title })), variantUpdatedAt: product.variants.map((v) => ({ id: v.id, updatedAt: v.updatedAt })) },
  });
  if (!result.success) throw new IntegrationError("INVALID_RESPONSE");
  return result.data;
}

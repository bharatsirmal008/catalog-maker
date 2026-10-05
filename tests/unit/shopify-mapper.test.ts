import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { mapShopifyProduct } from "../../src/lib/integrations/shopify/mapper";
import type { ShopifyProduct } from "../../src/lib/integrations/shopify/products";
const product: ShopifyProduct = { id: "gid://shopify/Product/1", title: "Fixture", description: "", handle: "fixture", status: "ACTIVE", onlineStoreUrl: "https://example.myshopify.com/products/fixture", publishedAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", tags: [], currency: "USD", images: [], collections: [], variants: [{ id: "gid://shopify/ProductVariant/1", title: "One", sku: null, price: "9999999999.99", inventoryQuantity: 0, inventoryPolicy: "CONTINUE", availableForSale: true, inventoryItem: { tracked: false }, selectedOptions: [], updatedAt: "2026-09-01T00:00:00Z" }] };
it("preserves unknown stock, nullable SKU and exact decimal", () => { const mapped = mapShopifyProduct(product); expect(mapped.price).toBe("9999999999.99"); expect(mapped.variants[0].stockQuantity).toBeNull(); expect(mapped.variants[0].sku).toBeNull(); });
it("maps tracked zero/backorder and unavailable variants distinctly", () => { const backorder = mapShopifyProduct({ ...product, variants: [{ ...product.variants[0], inventoryItem: { tracked: true } }] }); expect(backorder.availability).toBe("BACKORDER"); expect(backorder.variants[0].stockQuantity).toBe(0); expect(mapShopifyProduct({ ...product, variants: [{ ...product.variants[0], availableForSale: false }] }).availability).toBe("OUT_OF_STOCK"); });
it("hides unpublished, draft and archived products without using local visibility", () => {
  for (const status of ["DRAFT", "ARCHIVED", "UNLISTED"] as const) expect(mapShopifyProduct({ ...product, status }).sourceVisible).toBe(false);
  expect(mapShopifyProduct({ ...product, publishedAt: null }).sourceVisible).toBe(false);
});
it("shows active published products with no online store URL", () => {
  const mapped = mapShopifyProduct({ ...product, onlineStoreUrl: null });
  expect(mapped.sourceVisible).toBe(true);
  expect(mapped.sourceUrl).toBeNull();
  expect(mapped.availability).toBe("IN_STOCK");
});
it("rejects missing/invalid prices instead of inventing zero", () => { expect(() => mapShopifyProduct({ ...product, variants: [] })).toThrow(); expect(() => mapShopifyProduct({ ...product, variants: [{ ...product.variants[0], price: "bad" }] })).toThrow(); });

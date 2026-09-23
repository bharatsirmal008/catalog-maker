import { expect, it, vi } from "vitest";
import { allowedCatalogImage } from "@/lib/catalog/image-policy";
it("restricts images to approved HTTPS hosts and paths", () => {
  expect(allowedCatalogImage("https://cdn.shopify.com/s/files/1/product.jpg")).toBe(true);
  for (const src of ["http://cdn.shopify.com/s/files/a.jpg", "https://cdn.shopify.com.evil.test/s/files/a.jpg", "https://user:secret@images.unsplash.com/a.jpg", "https://127.0.0.1/a.jpg", "https://cdn.shopify.com/other/a.jpg", "/demo/../secret"]) expect(allowedCatalogImage(src)).toBe(false);
});
it("permits only the configured WooCommerce upload origin", () => {
  vi.stubEnv("NEXT_PUBLIC_CATALOG_WOO_ORIGIN", "https://store.test");
  try { expect(allowedCatalogImage("https://store.test/wp-content/uploads/a.jpg")).toBe(true); expect(allowedCatalogImage("https://store.test/private/a.jpg")).toBe(false); expect(allowedCatalogImage("https://other.test/wp-content/uploads/a.jpg")).toBe(false); } finally { vi.unstubAllEnvs(); }
});

import { expect, it, vi } from "vitest";
import { cloudinaryImageUrl } from "@/lib/catalog/cloudinary-policy";
import { validImageBytes, MAX_IMAGE_BYTES } from "@/lib/catalog/upload-validation";
import { imageUrl, createProduct } from "@/lib/validations/catalog";
it("allows only the configured Cloudinary image delivery namespace", () => {
  vi.stubEnv("NEXT_PUBLIC_CATALOG_CLOUDINARY_CLOUD_NAME", "my-shop");
  try {
    const good = "https://res.cloudinary.com/my-shop/image/upload/v1/catalog-maker/a.png";
    expect(cloudinaryImageUrl(good)).toBe(true); expect(imageUrl.safeParse(good).success).toBe(true);
    for (const bad of [good.replace("my-shop", "other"), good.replace("https:", "http:"), good.replace("image/upload", "raw/upload"), good.replace("res.cloudinary.com", "res.cloudinary.com.evil.test"), good + "?x=1", good.replace("https://", "https://user:pass@")]) expect(cloudinaryImageUrl(bad)).toBe(false);
  } finally { vi.unstubAllEnvs(); }
  expect(cloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/a.png", "")).toBe(false);
});
it("checks supported image signatures and size rather than trusting extensions", () => {
  expect(validImageBytes(new Uint8Array([255,216,255,1]), "image/jpeg")).toBe(true);
  expect(validImageBytes(new Uint8Array([137,80,78,71,13,10,26,10]), "image/png")).toBe(true);
  expect(validImageBytes(new TextEncoder().encode("RIFF0000WEBPdata"), "image/webp")).toBe(true);
  expect(validImageBytes(new TextEncoder().encode("<svg/>"), "image/png")).toBe(false);
  expect(validImageBytes(new Uint8Array(), "image/jpeg")).toBe(false);
  expect(validImageBytes(new Uint8Array(MAX_IMAGE_BYTES + 1), "image/jpeg")).toBe(false);
});
it("supports descriptions and enforces limits", () => {
  expect(createProduct.safeParse({ name: "Real shirt", price: "799", description: "Cotton, blue", images: [] }).success).toBe(true);
  expect(createProduct.safeParse({ name: "Shirt", price: "799", description: "a".repeat(10001) }).success).toBe(false);
});

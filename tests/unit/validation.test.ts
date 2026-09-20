import { describe, expect, it } from "vitest";
import { createProduct, updateProduct, createCategory, productQuery, catalogSettings } from "@/lib/validations/catalog";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
describe("catalog validation", () => {
  it("PATCH does not introduce defaults for omitted fields", () => expect(updateProduct.parse({ isVisible: false })).toEqual({ isVisible: false }));
  it("accepts decimal strings without float conversion", () => expect(createProduct.parse({ name: "Test", price: "0.10" }).price).toBe("0.10"));
  it.each(["-1", "1.999", "1e2", "Infinity", "10000000000.00"])("rejects unsafe price %s", (price) => expect(createProduct.safeParse({ name: "Test", price }).success).toBe(false));
  it("rejects numbers, empty names and protected fields", () => {
    expect(createProduct.safeParse({ name: " ", price: "1" }).success).toBe(false);
    expect(createProduct.safeParse({ name: "X", price: 1 }).success).toBe(false);
    expect(updateProduct.safeParse({ sourceProductId: "123" }).success).toBe(false);
  });
  it("validates categories, images, currency and pagination", () => {
    expect(createCategory.safeParse({ name: "A", parentId: "bad" }).success).toBe(false);
    expect(createProduct.safeParse({ name: "A", price: "1", currency: "ZZZ" }).success).toBe(false);
    expect(createProduct.safeParse({ name: "A", price: "1", images: [{ imageUrl: "http://127.0.0.1/a" }] }).success).toBe(false);
    for (const q of [{ page: "0" }, { limit: "49" }, { sort: "SQL" }, { available: "maybe" }]) expect(productQuery.safeParse(q).success).toBe(false);
    expect(productQuery.parse({})).toMatchObject({ page: 1, limit: 12 });
  });
  it("allows missing WhatsApp but rejects invalid destinations", () => {
    expect(catalogSettings.safeParse({ businessName: "A", whatsappNumber: null, activeTemplate: "GRID" }).success).toBe(true);
    expect(catalogSettings.safeParse({ businessName: "A", whatsappNumber: "+abc", activeTemplate: "GRID" }).success).toBe(false);
  });
});
describe("passwords", () => {
  it("salts, hashes and verifies passwords without storing plaintext", async () => {
    const a = await hashPassword("a sufficiently long test password");
    const b = await hashPassword("a sufficiently long test password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("a sufficiently long test password", a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
    expect(await verifyPassword("wrong", "malformed")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { emptySelection, parseSelection, toggleSelection } from "../../src/lib/catalog/selection-storage";
import { makeWhatsAppEnquiry } from "../../src/lib/catalog/whatsapp";
import { formatPrice } from "../../src/lib/catalog/format";
import type { ProductCardData } from "../../src/types/catalog";
import { uniqueSlug } from "../../src/lib/catalog/slug";
import { slug } from "../../src/lib/validations/catalog";
const first = "10000000-0000-4000-8000-000000000001", second = "10000000-0000-4000-8000-000000000002";
const product = (id = first, name = "Tote & <linen> / café"): ProductCardData => ({ id, name, slug: "test", price: "1290.25", currency: "INR", availability: "IN_STOCK", category: null, images: [] });
describe("ID-only persistent selection", () => {
  it("generates valid slugs even for maximum-length names", () => expect(slug.safeParse(uniqueSlug("a".repeat(160))).success).toBe(true));
  it.each([null, "bad json", "null", "[]", '{"version":9}', "x".repeat(21000)])("recovers from malformed storage %s", (raw) => expect(parseSelection(raw)).toEqual(emptySelection()));
  it("sanitizes IDs and deduplicates; ignores authoritative product snapshots", () => {
    expect(parseSelection(JSON.stringify({ version: 1, wishlist: [first, first, "bad", { id: second }], enquiry: [second], price: 99 }))).toEqual({ version: 1, wishlist: [first], enquiry: [second] });
  });
  it("toggles without duplicates and round-trips after reload", () => {
    const state = toggleSelection(emptySelection(), "wishlist", first);
    expect(parseSelection(JSON.stringify(state))).toEqual(state);
    expect(toggleSelection(state, "wishlist", first).wishlist).toEqual([]);
    expect(toggleSelection(state, "enquiry", second).wishlist).toEqual([first]);
  });
  it("caps storage and warns before exceeding 48", () => {
    const ids = Array.from({ length: 49 }, (_, i) => `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    const state = parseSelection(JSON.stringify({ version: 1, enquiry: ids }));
    expect(state.enquiry).toHaveLength(48);
    expect(() => toggleSelection(state, "enquiry", ids[48])).toThrow("up to 48");
    expect(toggleSelection(state, "enquiry", ids[0]).enquiry).toHaveLength(47);
  });
});
describe("WhatsApp enquiry", () => {
  it("encodes every unique name and URL with configured destination", () => {
    const products = [product(), product(second, "Second piece"), product()];
    const result = makeWhatsAppEnquiry("12025550123", products, "https://catalog.example");
    const url = new URL(result.url);
    expect(url.hostname).toBe("wa.me"); expect(url.pathname).toBe("/12025550123");
    expect(url.searchParams.get("text")).toBe(result.message);
    expect(result.message).toContain("Tote & <linen> / café");
    expect(result.message).toContain(`https://catalog.example/products/${first}`);
    expect(result.message).toContain(`https://catalog.example/products/${second}`);
    expect(result.message.match(/Tote/g)).toHaveLength(1);
    expect(result.message).toContain("₹1,290.25");
  });
  it.each([null, "", "123", "+12025550123", "0123456789", "javascript:123"])('rejects missing/invalid number %s', (number) => expect(() => makeWhatsAppEnquiry(number, [product()], "https://catalog.example")).toThrow("not configured"));
  it("rejects empty selection", () => expect(() => makeWhatsAppEnquiry("12025550123", [], "https://catalog.example")).toThrow("Select"));
  it("includes stock status without silently dropping unavailable products", () => expect(makeWhatsAppEnquiry("12025550123", [{ ...product(), availability: "OUT_OF_STOCK" }], "https://catalog.example").message).toContain("Out of stock"));
  it("handles long product names and rejects oversized URLs without truncating", () => {
    expect(makeWhatsAppEnquiry("12025550123", [product(first, "A".repeat(160))], "https://catalog.example").message).toContain("A".repeat(160));
    const many = Array.from({ length: 48 }, (_, i) => product(`id-${i}`, "Long name & café ".repeat(10)));
    expect(() => makeWhatsAppEnquiry("12025550123", many, "https://catalog.example")).toThrow("too long");
  });
  it("formats supported currencies and rejects nonnumeric price", () => {
    for (const code of ["INR", "USD", "EUR", "GBP"]) expect(formatPrice("1290.25", code)).toContain("1,290.25");
    expect(formatPrice("bad", "INR")).toBe("Price unavailable");
  });
});

import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { z } from "zod";
import { loadWooConfig, publicIPv4 } from "@/lib/integrations/woocommerce/config";
import { WooClient, type WooTransport } from "@/lib/integrations/woocommerce/client";
import { checkWooConnection, wooProductPages } from "@/lib/integrations/woocommerce/products";
import { mapWooProduct } from "@/lib/integrations/woocommerce/mapper";
import { wooFixture, wooCategories, wooVariation } from "../fixtures/woo";
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
import { wooChangedParams } from "@/lib/integrations/woocommerce/sync";
const config = { origin: "https://store.test", key: "ck_" + "1".repeat(40), secret: "cs_" + "2".repeat(40) };
const reply = (body: unknown, status = 200, pages = "1") => ({ status, body: JSON.stringify(body), headers: new Headers({ "x-wp-totalpages": pages }) });
describe("WooCommerce security and transport", () => {
  it("requires configured HTTPS origin and real-shaped server credentials", () => {
    expect(() => loadWooConfig({})).toThrow();
    for (const url of ["http://store.test", "https://user:pass@store.test", "https://127.0.0.1", "https://store.test/path", "https://store.local", "https://store.test/?x=1"]) expect(() => loadWooConfig({ WOOCOMMERCE_STORE_URL: url, WOOCOMMERCE_CONSUMER_KEY: config.key, WOOCOMMERCE_CONSUMER_SECRET: config.secret })).toThrow();
    expect(loadWooConfig({ WOOCOMMERCE_STORE_URL: config.origin, WOOCOMMERCE_CONSUMER_KEY: config.key, WOOCOMMERCE_CONSUMER_SECRET: config.secret }).origin).toBe(config.origin);
  });
  it("rejects loopback, private, reserved and IPv6 endpoints", () => { for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "198.18.0.1", "224.0.0.1", "::1", "::ffff:127.0.0.1"]) expect(publicIPv4(ip)).toBe(false); expect(publicIPv4("8.8.8.8")).toBe(true); });
  it("sends credentials only in the header to bounded API paths", async () => { const transport = vi.fn<WooTransport>(async (url, auth) => { expect(url.origin).toBe(config.origin); expect(url.search).not.toContain("consumer"); expect(auth).toMatch(/^Basic /); return reply({ ok: true }); }); const client = new WooClient(config, transport); await client.get("products", z.object({ ok: z.boolean() })); await expect(client.get("https://evil.test", z.unknown())).rejects.toThrow(); expect(transport).toHaveBeenCalledTimes(1); });
  it.each([401, 403, 302, 400])("rejects HTTP %s without retry or redirect", async (status) => { const transport = vi.fn<WooTransport>(async () => reply({ secret: "never expose" }, status)); await expect(new WooClient(config, transport).get("products", z.unknown())).rejects.not.toThrow("never expose"); expect(transport).toHaveBeenCalledTimes(1); });
  it("retries transient errors up to three attempts", async () => { const transport = vi.fn<WooTransport>(async () => reply({}, 503)); await expect(new WooClient(config, transport, async () => {}).get("products", z.unknown())).rejects.toThrow(); expect(transport).toHaveBeenCalledTimes(3); });
  it("times out a stalled request", async () => { await expect(new WooClient(config, () => new Promise(() => {}), async () => {}, 1).get("products", z.unknown())).rejects.toThrow(/timed out/); });
  it("rejects malformed success bodies", async () => { await expect(new WooClient(config, async () => reply({})).get("products", z.array(z.unknown()))).rejects.toThrow(/unexpected/); });
  it("verifies currency and authenticated product access", async () => { const client = new WooClient(config, async (url) => reply(url.pathname.includes("settings") ? { id: "woocommerce_currency", value: "INR" } : [{ id: 1 }])); expect((await checkWooConnection(client)).currency).toBe("INR"); });
});
describe("WooCommerce pagination and mapping", () => {
  it("uses a GMT overlap and no initial checkpoint filter", () => { expect(wooChangedParams(null, new Date())).toEqual({}); expect(wooChangedParams(new Date("2026-09-22T10:00:00Z"), new Date("2026-09-22T11:00:00Z"))).toEqual({ modified_after: "2026-09-22T09:55:00.000Z", modified_before: "2026-09-22T11:00:00.000Z", dates_are_gmt: "true" }); });
  it("requires a WooCommerce product-not-found code, not a generic 404", async () => { await expect(new WooClient(config, async () => reply({ code: "woocommerce_rest_product_invalid_id" }, 404)).get("products/1", z.unknown())).rejects.toMatchObject({ code: "NOT_FOUND" }); await expect(new WooClient(config, async () => reply({}, 404)).get("products/1", z.unknown())).rejects.toMatchObject({ code: "REMOTE" }); });
  it("completes product and nested variation pages", async () => {
    const paths: string[] = [];
    const client = new WooClient(config, async (url) => { paths.push(url.pathname); const page = url.searchParams.get("page"); if (url.pathname.endsWith("categories")) return reply(wooCategories); if (url.pathname.endsWith("variations")) return reply([wooVariation(page === "1" ? 11 : 12)], 200, "2"); return reply([{ ...wooFixture(), type: "variable", variations: [11, 12] }]); });
    const rows = []; for await (const page of wooProductPages(client)) rows.push(...page);
    expect(rows[0].variants).toHaveLength(2); expect(paths.filter((p) => p.endsWith("variations"))).toHaveLength(2);
  });
  it("rejects duplicate or inconsistent pages", async () => { const client = new WooClient(config, async () => reply([{ id: 1 }], 200, "2")); await expect((async () => { for await (const page of client.pages("products", z.object({ id: z.number() }))) void page; })()).rejects.toThrow(/pagination/); });
  it("maps current sale price, plain description, hierarchy and unknown stock", () => { const p = mapWooProduct(wooFixture(), [], wooCategories, "INR"); expect(p.price).toBe("12.50"); expect(p.description).toBe("Fixture only"); expect(p.variants[0].stockQuantity).toBeNull(); expect(p.categories[0].parentExternalId).toBe("1"); expect(p.updatedAt).toBe("2026-09-22T00:00:00Z"); });
  it("maps variable minimum price and zero-stock backorders", () => { const p = mapWooProduct({ ...wooFixture(), type: "variable", variations: [11] }, [wooVariation()], wooCategories, "USD"); expect(p.price).toBe("9.99"); expect(p.variants[0].stockQuantity).toBe(0); expect(p.availability).toBe("BACKORDER"); });
  it("hides unpublished products and rejects missing prices/unsupported types", () => { expect(mapWooProduct({ ...wooFixture(), status: "draft" }, [], wooCategories, "USD").sourceVisible).toBe(false); for (const product of [{ ...wooFixture(), price: "" }, { ...wooFixture(), type: "grouped" as const }]) expect(() => mapWooProduct(product, [], wooCategories, "USD")).toThrow(); });
  it("rejects missing variants and category cycles", () => { expect(() => mapWooProduct({ ...wooFixture(), type: "variable", variations: [11] }, [], wooCategories, "USD")).toThrow(); expect(() => mapWooProduct(wooFixture(), [], [{ id: 2, name: "Cycle", parent: 2 }], "USD")).toThrow(); });
});

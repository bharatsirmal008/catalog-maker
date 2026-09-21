import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { z } from "zod";
import { ShopifyClient } from "../../src/lib/integrations/shopify/client";
import { normalizeShopifyDomain, loadShopifyConfig, SHOPIFY_API_VERSION } from "../../src/lib/integrations/shopify/config";
import { shopifyProductPages } from "../../src/lib/integrations/shopify/products";
import { checkShopifyConnection } from "../../src/lib/integrations/shopify/connection";
const config = { domain: "fixture-store.myshopify.com", clientId: "fixture-client", clientSecret: "secret-never-echo", version: SHOPIFY_API_VERSION } as const;
const reply = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const token = () => reply({ access_token: "private-fixture-token", expires_in: 86399, scope: "read_products,read_inventory" });
const schema = z.object({ ok: z.boolean() });
function client(responses: Response[]) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(token());
  for (const response of responses) fetcher.mockResolvedValueOnce(response);
  const sleep = vi.fn(async () => {});
  return { api: new ShopifyClient(config, { fetch: fetcher, sleep }), fetcher, sleep };
}
describe("Shopify configuration", () => {
  it("normalizes a canonical store", () => expect(normalizeShopifyDomain(" HTTPS://Fixture-Store.myshopify.com/ ")).toBe(config.domain));
  it.each(["http://shop.myshopify.com", "https://user:pass@shop.myshopify.com", "https://shop.myshopify.com:443", "shop.myshopify.com/path", "shop.myshopify.com.evil.test", "127.0.0.1", "https://shop.myshopify.com?x=y", "a_b.myshopify.com"])("rejects unsafe domain %s", (domain) => expect(() => normalizeShopifyDomain(domain)).toThrow("configuration"));
  it("rejects missing credentials and unsupported versions", () => { expect(() => loadShopifyConfig({})).toThrow("configuration"); expect(() => loadShopifyConfig({ SHOPIFY_STORE_URL: config.domain, SHOPIFY_CLIENT_ID: "a", SHOPIFY_CLIENT_SECRET: "b", SHOPIFY_API_VERSION: "unstable" })).toThrow(); });
});
describe("Shopify transport", () => {
  it("caches token, uses HTTPS, prevents redirects and validates response", async () => {
    const { api, fetcher } = client([reply({ data: { ok: true } }), reply({ data: { ok: true } })]);
    await api.query("query Test { ok }", {}, schema); await api.query("query Test { ok }", {}, schema);
    expect(fetcher).toHaveBeenCalledTimes(3); expect(fetcher.mock.calls[1][0]).toBe(`https://${config.domain}/admin/api/2026-07/graphql.json`);
    expect(fetcher.mock.calls[1][1]?.redirect).toBe("error");
  });
  it.each([[401, "AUTHENTICATION"], [403, "PERMISSION"], [400, "REMOTE"]])("does not retry permanent HTTP %s", async (status, code) => {
    const { api, fetcher } = client([reply({ secret: config.clientSecret }, status as number)]);
    await expect(api.query("query Test { ok }", {}, schema)).rejects.toMatchObject({ code }); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("honors retry-after and stops at three attempts", async () => {
    const { api, fetcher, sleep } = client(Array.from({ length: 3 }, () => reply({}, 429, { "retry-after": "2" })));
    await expect(api.query("query Test { ok }", {}, schema)).rejects.toMatchObject({ code: "THROTTLED" });
    expect(fetcher).toHaveBeenCalledTimes(4); expect(sleep.mock.calls).toEqual([[2000], [2000]]);
  });
  it("does not retry too early for long retry-after", async () => { const { api, sleep } = client([reply({}, 429, { "retry-after": "90" })]); await expect(api.query("q", {}, schema)).rejects.toThrow(); expect(sleep).not.toHaveBeenCalled(); });
  it("handles HTTP-200 GraphQL errors without echoing secrets", async () => {
    const { api } = client([reply({ errors: [{ message: config.clientSecret, extensions: { code: "ACCESS_DENIED" } }] })]);
    await expect(api.query("q", {}, schema)).rejects.toMatchObject({ code: "PERMISSION" });
    const { api: invalid } = client([reply({ data: { raw: "private-fixture-token" } })]);
    await expect(invalid.query("q", {}, schema)).rejects.toThrow("unexpected data");
  });
  it("uses GraphQL cost information on throttling", async () => {
    const { api, sleep } = client([reply({ errors: [{ extensions: { code: "THROTTLED" } }], extensions: { cost: { requestedQueryCost: 100, throttleStatus: { currentlyAvailable: 0, restoreRate: 25 } } } }), reply({ data: { ok: true } })]);
    expect(await api.query("q", {}, schema)).toEqual({ ok: true }); expect(sleep).toHaveBeenCalledWith(4000);
  });
  it("times out and sanitizes network exceptions", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error(config.clientSecret)))));
    const api = new ShopifyClient(config, { fetch: fetcher, timeoutMs: 2, sleep: async () => {} });
    await expect(api.query("q", {}, schema)).rejects.toMatchObject({ code: "TIMEOUT", message: expect.not.stringContaining(config.clientSecret) }); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("validates expected shop and returns no credentials", async () => {
    const { api } = client([reply({ data: { shop: { id: "gid://shopify/Shop/1", name: "Fixture", myshopifyDomain: config.domain, currencyCode: "INR" } } })]);
    const result = await checkShopifyConnection(config, api); expect(result.currency).toBe("INR"); expect(JSON.stringify(result)).not.toContain("token");
  });
});
describe("complete cursor retrieval", () => {
  it("retrieves all nested variant/media/collection pages and product pages", async () => {
    const product = { id: "gid://shopify/Product/1", title: "Fixture product", description: "text", handle: "fixture", status: "ACTIVE", onlineStoreUrl: "https://fixture-store.myshopify.com/products/fixture", publishedAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", tags: [] };
    const variant = { id: "gid://shopify/ProductVariant/1", title: "Default", sku: null, price: "19.99", inventoryQuantity: null, inventoryPolicy: "DENY", availableForSale: true, inventoryItem: { tracked: false }, selectedOptions: [], updatedAt: product.updatedAt };
    const page = (nodes: unknown[], next = false) => ({ nodes, pageInfo: { hasNextPage: next, endCursor: next ? "cursor-1" : null } });
    const { api, fetcher } = client([
      reply({ data: { products: page([product], true) } }),
      reply({ data: { product: { variants: page([variant], true) } } }), reply({ data: { product: { variants: page([{ ...variant, id: "gid://shopify/ProductVariant/2" }]) } } }),
      reply({ data: { product: { media: page([{ id: "gid://shopify/MediaImage/1", __typename: "MediaImage", image: { url: "https://cdn.shopify.com/image.png", altText: null } }], true) } } }), reply({ data: { product: { media: page([{ id: "gid://shopify/Video/2", __typename: "Video" }]) } } }),
      reply({ data: { product: { collections: page([{ id: "gid://shopify/Collection/1", title: "One", handle: "one" }], true) } } }), reply({ data: { product: { collections: page([{ id: "gid://shopify/Collection/2", title: "Two", handle: "two" }]) } } }),
      reply({ data: { products: page([]) } }),
    ]);
    const result = []; for await (const records of shopifyProductPages(api, "INR")) result.push(...records);
    expect(result).toHaveLength(1); expect(result[0].variants).toHaveLength(2); expect(result[0].collections).toHaveLength(2); expect(result[0].images).toHaveLength(1); expect(result[0].variants[0].inventoryQuantity).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(9);
  });
  it("rejects missing pagination cursors instead of truncating", async () => {
    const { api } = client([reply({ data: { products: { nodes: [], pageInfo: { hasNextPage: true, endCursor: null } } } })]);
    await expect((async () => { for await (const records of shopifyProductPages(api, "INR")) void records; })()).rejects.toMatchObject({ code: "PAGINATION" });
  });
});

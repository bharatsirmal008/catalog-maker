import "server-only";
import { z } from "zod";
import { ShopifyClient } from "./client";
import { IntegrationError } from "../errors";
const gid = z.string().regex(/^gid:\/\/shopify\/[A-Za-z]+\/\d+$/);
const date = z.iso.datetime({ offset: true });
export const shopSchema = z.object({ shop: z.object({ id: gid, name: z.string(), myshopifyDomain: z.string(), currencyCode: z.string().regex(/^[A-Z]{3}$/) }) });
export const SHOP_QUERY = "query CatalogConnection { shop { id name myshopifyDomain currencyCode } }";
const productSchema = z.object({ id: gid, title: z.string().min(1), description: z.string(), handle: z.string(), status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT", "UNLISTED"]), onlineStoreUrl: z.url().nullable(), publishedAt: date.nullable(), updatedAt: date, tags: z.array(z.string()) });
const variantSchema = z.object({ id: gid, title: z.string(), sku: z.string().nullable(), price: z.string().regex(/^\d+(\.\d{1,2})?$/), inventoryQuantity: z.number().int().nullable(), inventoryPolicy: z.enum(["DENY", "CONTINUE"]), availableForSale: z.boolean(), inventoryItem: z.object({ tracked: z.boolean() }), selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })), updatedAt: date });
const imageSchema = z.object({ id: gid, __typename: z.string(), image: z.object({ url: z.url(), altText: z.string().nullable() }).nullable().optional() });
const collectionSchema = z.object({ id: gid, title: z.string(), handle: z.string() });
const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() });
function connection<T extends z.ZodType>(node: T) { return z.object({ nodes: z.array(node), pageInfo }); }
const productsPageSchema = z.object({ products: connection(productSchema) });
export type ShopifyProduct = z.infer<typeof productSchema> & { variants: z.infer<typeof variantSchema>[]; images: { id: string; url: string; altText: string | null }[]; collections: z.infer<typeof collectionSchema>[]; currency: string };
export const PRODUCTS_QUERY = `query CatalogProducts($after: String, $filter: String) { products(first: 20, after: $after, query: $filter, sortKey: UPDATED_AT) { nodes { id title description handle status onlineStoreUrl publishedAt updatedAt tags } pageInfo { hasNextPage endCursor } } }`;
const nested = {
  variants: { fields: "id title sku price inventoryQuantity inventoryPolicy availableForSale inventoryItem { tracked } selectedOptions { name value } updatedAt", schema: variantSchema },
  media: { fields: "id __typename ... on MediaImage { image { url altText } }", schema: imageSchema },
  collections: { fields: "id title handle", schema: collectionSchema },
};
async function collect<T>(load: (after: string | null) => Promise<{ nodes: T[]; pageInfo: z.infer<typeof pageInfo> }>, maxPages = 100): Promise<T[]> {
  const result: T[] = [], seen = new Set<string>(); let after: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const current = await load(after); result.push(...current.nodes);
    if (!current.pageInfo.hasNextPage) return result;
    const cursor = current.pageInfo.endCursor;
    if (!cursor || seen.has(cursor) || !current.nodes.length) throw new IntegrationError("PAGINATION");
    seen.add(cursor); after = cursor;
  }
  throw new IntegrationError("PAGINATION");
}
async function children<K extends keyof typeof nested>(client: ShopifyClient, id: string, key: K) {
  const spec = nested[key];
  const schema = z.object({ product: z.object({ [key]: connection(spec.schema) }).nullable() });
  return collect(async (after) => {
    const data = await client.query(`query CatalogChildren($id: ID!, $after: String) { product(id: $id) { ${key}(first: 50, after: $after) { nodes { ${spec.fields} } pageInfo { hasNextPage endCursor } } } }`, { id, after }, schema);
    if (!data.product) throw new IntegrationError("INVALID_RESPONSE");
    return data.product[key];
  });
}
export async function* shopifyProductPages(client: ShopifyClient, currency: string, filter?: string): AsyncGenerator<ShopifyProduct[]> {
  let after: string | null = null; const seen = new Set<string>();
  for (let page = 0; page < 500; page++) {
    const data: z.infer<typeof productsPageSchema> = await client.query(PRODUCTS_QUERY, { after, filter: filter ?? null }, productsPageSchema);
    const records: ShopifyProduct[] = [];
    for (const product of data.products.nodes) {
      const variants = z.array(variantSchema).parse(await children(client, product.id, "variants"));
      const media = z.array(imageSchema).parse(await children(client, product.id, "media"));
      const collections = z.array(collectionSchema).parse(await children(client, product.id, "collections"));
      records.push({ ...product, variants, collections, currency, images: media.flatMap((item) => item.__typename === "MediaImage" && item.image ? [{ id: item.id, ...item.image }] : []) });
    }
    yield records;
    if (!data.products.pageInfo.hasNextPage) return;
    const cursor: string | null = data.products.pageInfo.endCursor;
    if (!cursor || seen.has(cursor) || !data.products.nodes.length) throw new IntegrationError("PAGINATION");
    seen.add(cursor); after = cursor;
  }
  throw new IntegrationError("PAGINATION");
}

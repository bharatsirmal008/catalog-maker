import "server-only";
import { z } from "zod";
import { WooClient } from "./client";
const id = z.number().int().positive();
const image = z.object({ id: z.number().int(), src: z.url(), alt: z.string().default("") });
const stock = { price: z.string(), sku: z.string().default(""), regular_price: z.string().default(""), sale_price: z.string().default(""), manage_stock: z.union([z.boolean(), z.literal("parent")]), stock_quantity: z.number().int().nullable(), stock_status: z.enum(["instock", "outofstock", "onbackorder"]), status: z.string(), date_modified_gmt: z.string() };
export const wooCategorySchema = z.object({ id, name: z.string().min(1), parent: z.number().int().nonnegative() });
export const wooVariantSchema = z.object({ id, ...stock, attributes: z.array(z.object({ name: z.string(), option: z.string() })), image: image.nullable().optional() });
export const wooProductSchema = z.object({ id, ...stock, name: z.string().min(1), slug: z.string(), type: z.enum(["simple", "variable", "grouped", "external"]), description: z.string(), short_description: z.string().default(""), permalink: z.url(), catalog_visibility: z.enum(["visible", "catalog", "search", "hidden"]), categories: z.array(z.object({ id, name: z.string() })), images: z.array(image), variations: z.array(id).default([]) });
export type WooProduct = z.infer<typeof wooProductSchema>;
export type WooVariant = z.infer<typeof wooVariantSchema>;
export type WooCategory = z.infer<typeof wooCategorySchema>;
export async function checkWooConnection(client: WooClient) {
  const { data } = await client.get("settings/general/woocommerce_currency", z.object({ id: z.literal("woocommerce_currency"), value: z.string().regex(/^[A-Z]{3}$/) }));
  await client.get("products", z.array(z.object({ id })), { per_page: "1", context: "edit", status: "any" });
  return { storeUrl: client.config.origin, currency: data.value };
}
export async function* wooProductPages(client: WooClient, params: Record<string, string> = {}) {
  const categories: WooCategory[] = [];
  for await (const page of client.pages("products/categories", wooCategorySchema, { hide_empty: "false" })) categories.push(...page);
  for await (const page of client.pages("products", wooProductSchema, { context: "edit", status: "any", ...params })) {
    const rows: { product: WooProduct; variants: WooVariant[]; categories: WooCategory[] }[] = [];
    for (const product of page) {
      const variants: WooVariant[] = [];
      if (product.type === "variable") for await (const chunk of client.pages(`products/${product.id}/variations`, wooVariantSchema, { context: "edit", status: "any" })) variants.push(...chunk);
      rows.push({ product, variants, categories });
    }
    yield rows;
  }
}

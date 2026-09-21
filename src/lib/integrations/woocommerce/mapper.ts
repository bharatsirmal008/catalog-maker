import "server-only";
import { sourceProductSchema, compareMoney, type SourceProduct } from "../product";
import { IntegrationError } from "../errors";
import type { WooProduct, WooVariant, WooCategory } from "./products";
const plain = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const availability = (status: string) => status === "instock" ? "IN_STOCK" as const : status === "onbackorder" ? "BACKORDER" as const : "OUT_OF_STOCK" as const;
export function mapWooProduct(product: WooProduct, variants: WooVariant[], allCategories: WooCategory[], currency: string): SourceProduct {
  try {
    if (!["simple", "variable"].includes(product.type)) throw new Error();
    if (product.type === "variable" && (!variants.length || product.variations.some((id) => !variants.some((v) => v.id === id)))) throw new Error();
    const mapped = (product.type === "simple" ? [{ ...product, attributes: [], image: null }] : variants).map((v) => ({ externalId: String(v.id), title: "attributes" in v && v.attributes.length ? v.attributes.map((a) => a.option).join(" / ") : product.name, sku: v.sku || null, price: v.price, stockQuantity: v.manage_stock === "parent" ? (product.manage_stock ? product.stock_quantity : null) : v.manage_stock ? v.stock_quantity : null, availability: v.status === "publish" ? availability(v.stock_status) : "UNAVAILABLE" as const, attributes: Object.fromEntries(v.attributes.map((a) => [a.name, a.option])) }));
    const visible = product.status === "publish" && ["visible", "catalog"].includes(product.catalog_visibility);
    const included = new Map<number, WooCategory>();
    for (const category of product.categories) {
      let current = allCategories.find((c) => c.id === category.id); const seen = new Set<number>();
      if (!current) throw new Error();
      while (current) { if (seen.has(current.id)) throw new Error(); seen.add(current.id); included.set(current.id, current); if (!current.parent) break; current = allCategories.find((c) => c.id === current!.parent); if (!current) throw new Error(); }
    }
    const candidates = mapped.filter((v) => v.availability !== "UNAVAILABLE");
    const price = (candidates.length ? candidates : mapped).map((v) => v.price).sort(compareMoney)[0];
    const images = [...product.images, ...variants.flatMap((v) => v.image ? [v.image] : [])];
    return sourceProductSchema.parse({ externalId: String(product.id), name: plain(product.name), description: plain(product.description || product.short_description), price, currency, sku: product.sku || null, sourceUrl: product.permalink, sourceVisible: visible, availability: !visible || !candidates.length ? "UNAVAILABLE" : candidates.some((v) => v.availability === "IN_STOCK") ? "IN_STOCK" : candidates.some((v) => v.availability === "BACKORDER") ? "BACKORDER" : "OUT_OF_STOCK", updatedAt: /Z$|[+-]\d\d:\d\d$/.test(product.date_modified_gmt) ? product.date_modified_gmt : product.date_modified_gmt + "Z", categories: [...included.values()].map((c) => ({ externalId: String(c.id), name: plain(c.name), parentExternalId: c.parent ? String(c.parent) : null })), images: images.map((i) => ({ externalId: String(i.id), url: i.src, alt: plain(i.alt) || null })), variants: mapped, metadata: { type: product.type, status: product.status, regularPrice: product.regular_price, salePrice: product.sale_price, categories: product.categories } });
  } catch { throw new IntegrationError("INVALID_RESPONSE"); }
}

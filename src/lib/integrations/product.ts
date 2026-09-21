import { z } from "zod";
const price = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/);
const availability = z.enum(["IN_STOCK", "OUT_OF_STOCK", "BACKORDER", "UNAVAILABLE"]);
export const sourceProductSchema = z.object({
  externalId: z.string().min(1).max(200), name: z.string().min(1).max(1000), description: z.string().max(100000),
  price, currency: z.string().regex(/^[A-Z]{3}$/), sku: z.string().nullable(), sourceUrl: z.url().nullable(),
  sourceVisible: z.boolean(), availability, updatedAt: z.iso.datetime({ offset: true }),
  categories: z.array(z.object({ externalId: z.string().min(1), name: z.string().min(1), parentExternalId: z.string().nullable().optional() })).max(5000),
  images: z.array(z.object({ externalId: z.string(), url: z.url(), alt: z.string().nullable() })).max(5000),
  variants: z.array(z.object({ externalId: z.string().min(1), title: z.string(), sku: z.string().nullable(), price, stockQuantity: z.number().int().nullable(), availability, attributes: z.record(z.string(), z.string()) })).max(5000),
  metadata: z.record(z.string(), z.unknown()),
});
export type SourceProduct = z.infer<typeof sourceProductSchema>;
export function compareMoney(a: string, b: string) { const cents = (value: string) => { const [whole, part = ""] = value.split("."); return BigInt(whole) * BigInt(100) + BigInt(part.padEnd(2, "0")); }; return cents(a) < cents(b) ? -1 : cents(a) > cents(b) ? 1 : 0; }

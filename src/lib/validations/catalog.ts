import { z } from "zod";

export const uuid = z.uuid();
export const slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
export const money = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, "Use a non-negative decimal string with at most two decimal places");
export const currency = z.enum(["INR", "USD", "EUR", "GBP"]);
export const availability = z.enum(["IN_STOCK", "OUT_OF_STOCK", "BACKORDER", "UNAVAILABLE"]);
export const imageUrl = z.string().max(2048).refine((value) => {
  if (/^\/demo\/[a-z0-9-]+\.svg$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "images.unsplash.com" && !url.username && !url.password; } catch { return false; }
}, "Use a local /demo/name.svg asset or an HTTPS images.unsplash.com URL");
export const imageSchema = z.object({ imageUrl, altText: z.string().max(200).nullable().optional() }).strict();
export const createProduct = z.object({
  name: z.string().trim().min(1).max(160), slug: slug.optional(),
  description: z.string().max(10000).nullable().optional(),
  sku: z.string().trim().max(100).nullable().optional(),
  price: money, currency: currency.default("INR"), availability: availability.default("IN_STOCK"),
  categoryId: uuid.nullable().optional(),
  isVisible: z.boolean().default(true), isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(100000).default(0),
  images: z.array(imageSchema).max(12).optional(),
}).strict();
export const updateProduct = createProduct.partial().extend({
  currency: currency.optional(), availability: availability.optional(),
  isVisible: z.boolean().optional(), isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(100000).optional(),
}).refine((v) => Object.keys(v).length > 0, "Provide at least one field");
export const createCategory = z.object({
  name: z.string().trim().min(1).max(100), slug: slug.optional(),
  parentId: uuid.nullable().optional(), displayOrder: z.number().int().min(0).max(100000).default(0),
  isVisible: z.boolean().default(true),
}).strict();
export const updateCategory = createCategory.partial().extend({
  isVisible: z.boolean().optional(), displayOrder: z.number().int().min(0).max(100000).optional(),
}).refine((v) => Object.keys(v).length > 0, "Provide at least one field");
export const productQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().max(100).optional(),
  category: slug.optional(),
  available: z.enum(["true", "false"]).optional(),
  sort: z.enum(["featured", "newest", "price_asc", "price_desc", "name_asc"]).default("featured"),
  ids: z.string().transform((v) => v.split(",")).pipe(z.array(uuid).min(1).max(48)).optional(),
}).strict();
export const categoryQuery = z.object({ parentId: uuid.optional() }).strict();
export const catalogSettings = z.object({
  businessName: z.string().trim().min(1).max(100),
  whatsappNumber: z.string().regex(/^[1-9]\d{6,14}$/, "Use international digits only, without + or spaces").nullable(),
  activeTemplate: z.literal("GRID"),
}).strict();
export const loginSchema = z.object({ email: z.email().max(254).transform((s) => s.toLowerCase()), password: z.string().min(1).max(256) }).strict();
export type ProductInput = z.infer<typeof createProduct>;
export type ProductUpdate = z.infer<typeof updateProduct>;
export type CategoryInput = z.infer<typeof createCategory>;
export type CategoryUpdate = z.infer<typeof updateCategory>;
export type ProductQuery = z.infer<typeof productQuery>;

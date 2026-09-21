import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import type { ProductInput, ProductUpdate, ProductQuery } from "@/lib/validations/catalog";
import { categorySelect, listCategories } from "./category.service";
import { uniqueSlug } from "./slug";

const imageSelect = { id: true, imageUrl: true, altText: true, displayOrder: true } as const;
export const cardSelect = {
  id: true, name: true, slug: true, price: true, currency: true, availability: true,
  category: { select: categorySelect },
  images: { select: imageSelect, orderBy: { displayOrder: "asc" as const }, take: 1 },
} satisfies Prisma.ProductSelect;
export const detailSelect = {
  ...cardSelect, description: true, sku: true, sourceUrl: true,
  images: { select: imageSelect, orderBy: { displayOrder: "asc" as const } },
  variants: { select: { id: true, sku: true, title: true, price: true, stockQuantity: true, availability: true, attributes: true }, orderBy: { id: "asc" as const } },
} satisfies Prisma.ProductSelect;
function card(row: Prisma.ProductGetPayload<{ select: typeof cardSelect }>) {
  return { ...row, price: row.price.toFixed(2) };
}
async function publicWhere(): Promise<Prisma.ProductWhereInput> {
  const categories = await listCategories();
  return { isVisible: true, sourceVisible: true, OR: [{ categoryId: null }, { categoryId: { in: categories.map((c) => c.id) } }] };
}
export async function listProducts(query: ProductQuery, admin = false) {
  const where: Prisma.ProductWhereInput = { AND: [
    ...(!admin ? [await publicWhere()] : []),
    ...(query.q ? [{ OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { sku: { contains: query.q, mode: "insensitive" as const } }] }] : []),
    ...(query.category ? [{ category: { slug: query.category } }] : []),
    ...(query.available ? [{ availability: query.available === "true" ? "IN_STOCK" as const : { not: "IN_STOCK" as const } }] : []),
    ...(query.ids ? [{ id: { in: query.ids } }] : []),
  ] };
  const sorts: Record<ProductQuery["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
    featured: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { id: "asc" }],
    newest: [{ createdAt: "desc" }, { id: "asc" }],
    price_asc: [{ price: "asc" }, { id: "asc" }], price_desc: [{ price: "desc" }, { id: "asc" }],
    name_asc: [{ name: "asc" }, { id: "asc" }],
  };
  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: { ...cardSelect, ...(admin ? { isVisible: true, sourceConnectionId: true, sourceProductId: true } : {}) }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: sorts[query.sort] }),
  ], { isolationLevel: "RepeatableRead" });
  return { data: rows.map(card), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
export async function productDetail(id: string, admin = false) {
  const row = await prisma.product.findFirst({ where: { id, ...(!admin ? await publicWhere() : {}) }, select: detailSelect });
  if (!row) throw new ApiError(404, "Product not found");
  return { ...row, price: row.price.toFixed(2), variants: row.variants.map((v) => ({ ...v, price: v.price.toFixed(2) })) };
}
export async function relatedProducts(id: string) {
  const product = await productDetail(id);
  if (!product.category) return [];
  const rows = await prisma.product.findMany({ where: { AND: [await publicWhere(), { categoryId: product.category.id, id: { not: id }, availability: "IN_STOCK" }] }, select: cardSelect, take: 4, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
  return rows.map(card);
}
export async function writeProduct(data: ProductInput | ProductUpdate, id?: string) {
  return prisma.$transaction(async (tx) => {
    const existing = id ? await tx.product.findUnique({ where: { id } }) : null;
    if (id && !existing) throw new ApiError(404, "Product not found");
    if (existing?.sourceConnectionId && Object.keys(data).some((key) => !["isVisible", "isFeatured", "displayOrder"].includes(key))) throw new ApiError(409, "Imported product source fields are read-only; only visibility, featured and display order can be edited");
    if (data.categoryId && !await tx.category.findUnique({ where: { id: data.categoryId } })) throw new ApiError(400, "Category does not exist");
    const { images, price, ...fields } = data;
    const payload = { ...fields, ...(price !== undefined ? { price: new Prisma.Decimal(price) } : {}) };
    if (id) {
      if (images) await tx.productImage.deleteMany({ where: { productId: id } });
      return tx.product.update({ where: { id }, data: { ...payload, ...(images ? { images: { create: images.map((image, displayOrder) => ({ ...image, displayOrder })) } } : {}) }, select: detailSelect });
    }
    return tx.product.create({ data: { ...fields, name: fields.name!, slug: fields.slug ?? uniqueSlug(fields.name!), price: new Prisma.Decimal(price!), images: { create: images?.map((image, displayOrder) => ({ ...image, displayOrder })) } }, select: detailSelect });
  });
}
export async function deleteProduct(id: string) {
  const row = await prisma.product.findUnique({ where: { id }, select: { sourceConnectionId: true } });
  if (!row) throw new ApiError(404, "Product not found");
  if (row.sourceConnectionId) throw new ApiError(409, "Hide imported products instead of deleting their source identity");
  return prisma.product.delete({ where: { id } });
}

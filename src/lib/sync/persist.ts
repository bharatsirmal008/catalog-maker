import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sourceProductSchema, type SourceProduct } from "@/lib/integrations/product";
import { IntegrationError } from "@/lib/integrations/errors";
export function sourceHash(product: SourceProduct) { return createHash("sha256").update(JSON.stringify(product)).digest("hex"); }
const identitySlug = (kind: string, connectionId: string, externalId: string) => `${kind}-${createHash("sha256").update(`${connectionId}:${externalId}`).digest("hex")}`;
export async function persistSourceProduct(connectionId: string, input: SourceProduct, runId?: string) {
  const product = sourceProductSchema.parse(input);
  if (new Set(product.variants.map((v) => v.externalId)).size !== product.variants.length) throw new IntegrationError("INVALID_RESPONSE");
  const hash = sourceHash(product);
  return prisma.$transaction(async (tx) => {
    if (runId) {
      const fence = await tx.syncRun.updateMany({ where: { id: runId, sourceConnectionId: connectionId, status: "RUNNING" }, data: { status: "RUNNING" } });
      if (fence.count !== 1) throw new IntegrationError("NETWORK");
    }
    const existing = await tx.product.findUnique({ where: { sourceConnectionId_sourceProductId: { sourceConnectionId: connectionId, sourceProductId: product.externalId } } });
    if (existing?.sourceHash === hash) return "skipped" as const;
    // Do not roll a newer imported record backwards when source pages race updates.
    if (existing?.sourceUpdatedAt && existing.sourceUpdatedAt > new Date(product.updatedAt)) return "skipped" as const;
    let categoryId: string | null = null;
    const categoryIds = new Map<string, string>();
    for (const category of product.categories) {
      const row = await tx.category.upsert({ where: { sourceConnectionId_sourceCategoryId: { sourceConnectionId: connectionId, sourceCategoryId: category.externalId } },
        create: { name: category.name, slug: identitySlug("category", connectionId, category.externalId), sourceConnectionId: connectionId, sourceCategoryId: category.externalId }, update: { name: category.name } });
      categoryId ??= row.id;
      categoryIds.set(category.externalId, row.id);
    }
    for (const category of product.categories) {
      if (category.parentExternalId !== undefined) {
        const parentId = category.parentExternalId ? categoryIds.get(category.parentExternalId) : null;
        if (parentId === undefined) throw new IntegrationError("INVALID_RESPONSE");
        await tx.category.update({ where: { id: categoryIds.get(category.externalId)! }, data: { parentId } });
      }
    }
    const data = { name: product.name, description: product.description, sku: product.sku, price: new Prisma.Decimal(product.price), currency: product.currency, sourceUrl: product.sourceUrl,
      sourceVisible: product.sourceVisible, sourceUpdatedAt: new Date(product.updatedAt), sourceHash: hash, sourceMetadata: product.metadata as Prisma.InputJsonValue, availability: product.availability, categoryId };
    const row = await tx.product.upsert({ where: { sourceConnectionId_sourceProductId: { sourceConnectionId: connectionId, sourceProductId: product.externalId } },
      create: { ...data, sourceConnectionId: connectionId, sourceProductId: product.externalId, slug: identitySlug("product", connectionId, product.externalId) }, update: data });
    await tx.productImage.deleteMany({ where: { productId: row.id } });
    const images = [...new Map(product.images.map((image) => [image.url, image])).values()];
    await tx.productImage.createMany({ data: images.map((image, displayOrder) => ({ productId: row.id, imageUrl: image.url, altText: image.alt, displayOrder })) });
    await tx.productVariant.deleteMany({ where: { productId: row.id, sourceVariantId: { notIn: product.variants.map((variant) => variant.externalId) } } });
    for (const variant of product.variants) {
      const fields = { title: variant.title, sku: variant.sku, price: new Prisma.Decimal(variant.price), stockQuantity: variant.stockQuantity, availability: variant.availability, attributes: variant.attributes };
      await tx.productVariant.upsert({ where: { productId_sourceVariantId: { productId: row.id, sourceVariantId: variant.externalId } }, create: { ...fields, productId: row.id, sourceVariantId: variant.externalId }, update: fields });
    }
    return existing ? "updated" as const : "imported" as const;
  }, { timeout: 30000 });
}

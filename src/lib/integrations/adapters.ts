import "server-only";
import type { SourceProvider } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import { importShopifyProducts, registerShopifySource } from "./shopify/import";
import { synchronizeShopifyConnection } from "./shopify/sync";
import { loadShopifyConfig } from "./shopify/config";
import { checkShopifyConnection } from "./shopify/connection";
import { configuredWooClient, importWooProducts, registerWooSource } from "./woocommerce/import";
import { checkWooConnection } from "./woocommerce/products";
import { synchronizeWooConnection } from "./woocommerce/sync";
export interface CatalogSourceAdapter {
  register: typeof registerShopifySource;
  importProducts: typeof importShopifyProducts;
  synchronize: typeof synchronizeShopifyConnection;
  testConnection(id: string): Promise<void>;
}
export const adapters: Record<SourceProvider, CatalogSourceAdapter> = {
  SHOPIFY: { register: registerShopifySource, importProducts: importShopifyProducts, synchronize: synchronizeShopifyConnection, testConnection: async (id) => {
    const config = loadShopifyConfig(); const source = await prisma.sourceConnection.findUniqueOrThrow({ where: { id } });
    if (source.credentialKey !== "SHOPIFY_DEFAULT" || source.storeUrl !== `https://${config.domain}`) throw new ApiError(409, "Source configuration does not match.");
    await checkShopifyConnection(config);
  } },
  WOOCOMMERCE: { register: registerWooSource, importProducts: importWooProducts, synchronize: synchronizeWooConnection, testConnection: async (id) => { await checkWooConnection(await configuredWooClient(id)); } },
};
export async function sourceAdapter(id: string) { const source = await prisma.sourceConnection.findUnique({ where: { id } }); if (!source) throw new ApiError(404, "Source not found"); return adapters[source.provider]; }
export async function setSourceEnabled(id: string, enabled: boolean) {
  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${id}, 0)) AS locked`;
    if (!lock.locked) throw new ApiError(409, "Wait for the current source operation to finish.");
    return tx.sourceConnection.update({ where: { id }, data: { enabled }, select: { id: true, enabled: true } });
  });
}

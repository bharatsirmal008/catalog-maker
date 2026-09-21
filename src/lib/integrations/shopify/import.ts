import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import { loadShopifyConfig } from "./config";
import { ShopifyClient } from "./client";
import { checkShopifyConnection } from "./connection";
import { shopifyProductPages } from "./products";
import { mapShopifyProduct } from "./mapper";
import { IntegrationError } from "../errors";
import { runImport } from "@/lib/sync/import";
export async function registerShopifySource() {
  const config = loadShopifyConfig();
  await checkShopifyConnection(config);
  const storeUrl = `https://${config.domain}`;
  return prisma.sourceConnection.upsert({ where: { provider_storeUrl: { provider: "SHOPIFY", storeUrl } }, create: { provider: "SHOPIFY", storeUrl, credentialKey: "SHOPIFY_DEFAULT", enabled: true, verifiedAt: new Date() }, update: { verifiedAt: new Date() }, select: { id: true, provider: true, storeUrl: true, enabled: true, verifiedAt: true } });
}
export async function importShopifyProducts(connectionId: string) {
  const source = await prisma.sourceConnection.findUnique({ where: { id: connectionId } });
  const config = loadShopifyConfig();
  if (!source || source.provider !== "SHOPIFY" || source.credentialKey !== "SHOPIFY_DEFAULT" || source.storeUrl !== `https://${config.domain}`) throw new ApiError(409, "Source does not match the configured Shopify store.");
  return runImport(connectionId, async function* () {
    const client = new ShopifyClient(config);
    const shop = await checkShopifyConnection(config, client);
    for await (const products of shopifyProductPages(client, shop.currency)) yield products.map((product) => { try { return mapShopifyProduct(product); } catch { return new IntegrationError("INVALID_RESPONSE"); } });
  });
}

import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import { runImport } from "@/lib/sync/import";
import { IntegrationError } from "../errors";
import { loadWooConfig } from "./config";
import { WooClient } from "./client";
import { checkWooConnection, wooProductPages } from "./products";
import { mapWooProduct } from "./mapper";
export async function registerWooSource() {
  const config = loadWooConfig(); await checkWooConnection(new WooClient(config));
  return prisma.sourceConnection.upsert({ where: { provider_storeUrl: { provider: "WOOCOMMERCE", storeUrl: config.origin } }, create: { provider: "WOOCOMMERCE", storeUrl: config.origin, credentialKey: "WOOCOMMERCE_DEFAULT", enabled: true, verifiedAt: new Date() }, update: { verifiedAt: new Date() }, select: { id: true, provider: true, storeUrl: true, enabled: true, verifiedAt: true } });
}
export async function configuredWooClient(connectionId: string) {
  const config = loadWooConfig(); const source = await prisma.sourceConnection.findUnique({ where: { id: connectionId } });
  if (!source || source.provider !== "WOOCOMMERCE" || source.credentialKey !== "WOOCOMMERCE_DEFAULT" || source.storeUrl !== config.origin) throw new ApiError(409, "Source does not match the configured WooCommerce store.");
  return new WooClient(config);
}
export async function importWooProducts(connectionId: string) {
  const client = await configuredWooClient(connectionId);
  return runImport(connectionId, async function* () {
    const shop = await checkWooConnection(client);
    for await (const page of wooProductPages(client)) yield page.map(({ product, variants, categories }) => { try { return mapWooProduct(product, variants, categories, shop.currency); } catch { return new IntegrationError("INVALID_RESPONSE"); } });
  });
}

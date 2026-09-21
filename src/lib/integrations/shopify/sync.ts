import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import { runImport } from "@/lib/sync/import";
import { IntegrationError } from "../errors";
import { loadShopifyConfig } from "./config";
import { ShopifyClient } from "./client";
import { checkShopifyConnection } from "./connection";
import { shopifyProductPages } from "./products";
import { mapShopifyProduct } from "./mapper";

export function changedProductsFilter(checkpoint: Date | null, startedAt: Date) {
  if (!checkpoint) return undefined;
  const lower = new Date(checkpoint.getTime() - 5 * 60 * 1000).toISOString();
  return `updated_at:>='${lower}' updated_at:<='${startedAt.toISOString()}'`;
}
export async function synchronizeShopifyConnection(connectionId: string, full = false) {
  const config = loadShopifyConfig();
  const source = await prisma.sourceConnection.findUnique({ where: { id: connectionId } });
  if (!source || source.provider !== "SHOPIFY" || source.credentialKey !== "SHOPIFY_DEFAULT" || source.storeUrl !== `https://${config.domain}`) throw new ApiError(409, "Source does not match the configured Shopify store.");
  const client = new ShopifyClient(config);
  return runImport(connectionId, async function* ({ checkpoint, startedAt }) {
    const shop = await checkShopifyConnection(config, client);
    for await (const page of shopifyProductPages(client, shop.currency, full ? undefined : changedProductsFilter(checkpoint, startedAt))) {
      yield page.map((product) => { try { return mapShopifyProduct(product); } catch { return new IntegrationError("INVALID_RESPONSE"); } });
    }
  }, { checkpoint: true, reconcile: full ? async (seen) => {
    const candidates = await prisma.product.findMany({ where: { sourceConnectionId: connectionId, sourceVisible: true, sourceProductId: { not: null } }, select: { sourceProductId: true }, take: 1001 });
    if (candidates.length > 1000) throw new IntegrationError("PAGINATION");
    const missing: string[] = [];
    // Revalidate access before interpreting null as source absence.
    await checkShopifyConnection(config, client);
    for (const candidate of candidates) {
      const id = candidate.sourceProductId!;
      if (seen.has(id)) continue;
      const result = await client.query("query CatalogVerifyProduct($id: ID!) { product(id: $id) { id } }", { id }, z.object({ product: z.object({ id: z.string() }).nullable() }));
      if (result.product === null) missing.push(id);
    }
    return missing;
  } : undefined });
}

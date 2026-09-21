import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { runImport } from "@/lib/sync/import";
import { IntegrationError } from "../errors";
import { configuredWooClient } from "./import";
import { checkWooConnection, wooProductPages } from "./products";
import { mapWooProduct } from "./mapper";
export function wooChangedParams(checkpoint: Date | null, startedAt: Date): Record<string, string> {
  return checkpoint ? { modified_after: new Date(checkpoint.getTime() - 5 * 60 * 1000).toISOString(), modified_before: startedAt.toISOString(), dates_are_gmt: "true" } : {};
}
export async function synchronizeWooConnection(connectionId: string, full = false) {
  const client = await configuredWooClient(connectionId);
  return runImport(connectionId, async function* ({ checkpoint, startedAt }) {
    const shop = await checkWooConnection(client);
    for await (const page of wooProductPages(client, full ? {} : wooChangedParams(checkpoint, startedAt))) yield page.map(({ product, variants, categories }) => { try { return mapWooProduct(product, variants, categories, shop.currency); } catch { return new IntegrationError("INVALID_RESPONSE"); } });
  }, { checkpoint: true, reconcile: full ? async (seen) => {
    await checkWooConnection(client);
    const rows = await prisma.product.findMany({ where: { sourceConnectionId: connectionId, sourceVisible: true, sourceProductId: { not: null } }, select: { sourceProductId: true }, take: 1001 });
    if (rows.length > 1000) throw new IntegrationError("PAGINATION");
    const missing: string[] = [];
    for (const row of rows) {
      if (seen.has(row.sourceProductId!)) continue;
      try { await client.get(`products/${row.sourceProductId}`, z.object({ id: z.number().int().positive() }), { context: "edit" }); }
      catch (error) { if (error instanceof IntegrationError && error.code === "NOT_FOUND") missing.push(row.sourceProductId!); else throw error; }
    }
    return missing;
  } : undefined });
}

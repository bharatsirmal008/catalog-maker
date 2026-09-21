import { z } from "zod";
import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { importShopifyProducts } from "@/lib/integrations/shopify/import";
import { importWooProducts } from "@/lib/integrations/woocommerce/import";
import { prisma } from "@/lib/db/prisma";
export const maxDuration = 900;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => { await requireAdmin(request); const id = z.uuid().parse((await params).id); z.object({ confirm: z.literal(true) }).strict().parse(await readJson(request)); const source = await prisma.sourceConnection.findUniqueOrThrow({ where: { id } }); return json({ data: await (source.provider === "SHOPIFY" ? importShopifyProducts(id) : importWooProducts(id)) }); });
}

import { z } from "zod";
import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { synchronizeShopifyConnection } from "@/lib/integrations/shopify/sync";
export const maxDuration = 900;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    await requireAdmin(request);
    const id = z.uuid().parse((await params).id);
    const input = z.object({ confirm: z.literal(true), full: z.boolean().default(false) }).strict().parse(await readJson(request));
    return json({ data: await synchronizeShopifyConnection(id, input.full) });
  });
}

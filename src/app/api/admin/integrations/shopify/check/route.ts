import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { endpoint, json, readJson } from "@/lib/api/http";
import { checkShopifyConnection } from "@/lib/integrations/shopify/connection";
import { IntegrationError } from "@/lib/integrations/errors";
export async function POST(request: Request) {
  return endpoint(async () => {
    await requireAdmin(request); z.object({}).strict().parse(await readJson(request));
    try { return json({ data: await checkShopifyConnection() }); }
    catch (error) { if (error instanceof IntegrationError) return json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, error.code === "CONFIGURATION" ? 409 : 502); throw error; }
  });
}

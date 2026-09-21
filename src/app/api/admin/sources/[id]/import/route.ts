import { z } from "zod";
import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { sourceAdapter } from "@/lib/integrations/adapters";
export const maxDuration = 900;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => { await requireAdmin(request); const id = z.uuid().parse((await params).id); z.object({ confirm: z.literal(true) }).strict().parse(await readJson(request)); return json({ data: await (await sourceAdapter(id)).importProducts(id) }); });
}

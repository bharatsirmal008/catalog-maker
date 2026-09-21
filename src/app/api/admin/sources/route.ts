import { z } from "zod";
import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { adapters } from "@/lib/integrations/adapters";
export async function GET() { return endpoint(async () => { await requireAdmin(); return json({ data: await prisma.sourceConnection.findMany({ select: { id: true, provider: true, storeUrl: true, enabled: true, verifiedAt: true, lastSyncAt: true, _count: { select: { products: true } }, syncRuns: { take: 10, orderBy: { startedAt: "desc" } } }, orderBy: { createdAt: "asc" } }) }); }); }
export async function POST(request: Request) { return endpoint(async () => { await requireAdmin(request); const input = z.object({ provider: z.enum(["SHOPIFY", "WOOCOMMERCE"]) }).strict().parse(await readJson(request)); return json({ data: await adapters[input.provider].register() }, 201); }); }

import { z } from "zod";
import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { registerShopifySource } from "@/lib/integrations/shopify/import";
export async function GET() { return endpoint(async () => { await requireAdmin(); return json({ data: await prisma.sourceConnection.findMany({ select: { id: true, provider: true, storeUrl: true, enabled: true, verifiedAt: true, lastSyncAt: true, _count: { select: { products: true } }, syncRuns: { take: 10, orderBy: { startedAt: "desc" } } }, orderBy: { createdAt: "asc" } }) }); }); }
export async function POST(request: Request) { return endpoint(async () => { await requireAdmin(request); z.object({ provider: z.literal("SHOPIFY") }).strict().parse(await readJson(request)); return json({ data: await registerShopifySource() }, 201); }); }

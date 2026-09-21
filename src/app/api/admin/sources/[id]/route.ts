import { z } from "zod";
import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sourceAdapter, setSourceEnabled } from "@/lib/integrations/adapters";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) { return endpoint(async () => { await requireAdmin(request); const id = z.uuid().parse((await params).id); z.object({ action: z.literal("check") }).strict().parse(await readJson(request)); await (await sourceAdapter(id)).testConnection(id); await prisma.sourceConnection.update({ where: { id }, data: { verifiedAt: new Date() } }); return json({ data: { verified: true } }); }); }
export async function PATCH(request: Request, { params }: Context) { return endpoint(async () => { await requireAdmin(request); const id = z.uuid().parse((await params).id); const input = z.object({ enabled: z.boolean() }).strict().parse(await readJson(request)); return json({ data: await setSourceEnabled(id, input.enabled) }); }); }

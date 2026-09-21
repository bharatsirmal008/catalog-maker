import { z } from "zod";
import { endpoint, json } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { return endpoint(async () => { await requireAdmin(); const id = z.uuid().parse((await params).id); return json({ data: await prisma.syncRun.findMany({ where: { sourceConnectionId: id }, orderBy: { startedAt: "desc" }, take: 20 }) }); }); }

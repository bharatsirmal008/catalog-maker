import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { z } from "zod";
import { catalogSettings } from "@/lib/validations/catalog";

const select = { businessName: true, whatsappNumber: true, activeTemplate: true } as const;
export async function getCatalogConfig() {
  return await prisma.catalogConfig.findFirst({ select, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }) ??
    { businessName: "Catalog Maker", whatsappNumber: null, activeTemplate: "GRID" as const };
}
export async function saveCatalogConfig(data: z.infer<typeof catalogSettings>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7438292)`;
    const existing = await tx.catalogConfig.findFirst({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    return existing ? tx.catalogConfig.update({ where: { id: existing.id }, data, select }) : tx.catalogConfig.create({ data, select });
  });
}

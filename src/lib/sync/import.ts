import "server-only";
import { Pool } from "pg";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import { IntegrationError } from "@/lib/integrations/errors";
import type { SourceProduct } from "@/lib/integrations/product";
import { persistSourceProduct } from "./persist";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
export type SyncContext = { checkpoint: Date | null; startedAt: Date };
export type SourceReader = (context: SyncContext) => AsyncIterable<(SourceProduct | IntegrationError)[]>;
type SyncOptions = { checkpoint?: boolean; reconcile?: (seen: Set<string>) => Promise<string[]> };
export async function runImport(connectionId: string, read: SourceReader, options: SyncOptions = {}) {
  const lock = await pool.connect(); let acquired = false;
  let lockLost = false;
  lock.on("error", () => { lockLost = true; });
  try {
    acquired = (await lock.query("SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked", [connectionId])).rows[0].locked;
    if (!acquired) throw new ApiError(409, "This source is already importing.");
    const connection = await prisma.sourceConnection.findUnique({ where: { id: connectionId } });
    if (!connection?.enabled || !connection.verifiedAt) throw new ApiError(409, "Enable and verify the configured source first.");
    await prisma.syncRun.updateMany({ where: { sourceConnectionId: connectionId, status: "RUNNING" }, data: { status: "FAILED", completedAt: new Date(), errorSummary: "Previous run was interrupted; safe to retry." } });
    const run = await prisma.syncRun.create({ data: { sourceConnectionId: connectionId, status: "RUNNING" } });
    const counts = { importedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0 }; let errorSummary: string | null = null;
    try {
      let processed = 0; const seen = new Set<string>();
      for await (const page of read({ checkpoint: connection.lastSyncAt, startedAt: run.startedAt })) {
        if (Date.now() - run.startedAt.getTime() > 10 * 60 * 1000 || processed + page.length > 1000) throw new IntegrationError("PAGINATION");
        for (const product of page) {
          if (lockLost) throw new IntegrationError("NETWORK");
          if (Date.now() - run.startedAt.getTime() > 10 * 60 * 1000) throw new IntegrationError("TIMEOUT");
          processed++;
          try { if (product instanceof IntegrationError) throw product; seen.add(product.externalId); const result = await persistSourceProduct(connectionId, product, run.id); counts[`${result}Count`]++; }
          catch { counts.failedCount++; errorSummary = "One or more source records could not be imported. Correct source data and retry."; }
        }
        await prisma.syncRun.updateMany({ where: { id: run.id, status: "RUNNING" }, data: counts });
      }
      if (!counts.failedCount) {
        const missing = options.reconcile ? await options.reconcile(seen) : [];
        if (lockLost) throw new IntegrationError("NETWORK");
        if (Date.now() - run.startedAt.getTime() > 10 * 60 * 1000) throw new IntegrationError("TIMEOUT");
        return await prisma.$transaction(async (tx) => {
          const fence = await tx.syncRun.updateMany({ where: { id: run.id, status: "RUNNING" }, data: { status: "SUCCEEDED", ...counts, completedAt: new Date() } });
          if (fence.count !== 1) throw new IntegrationError("NETWORK");
          // All absence checks must succeed before any hiding or checkpoint advance.
          const hidden = await tx.product.updateMany({ where: { sourceConnectionId: connectionId, sourceProductId: { in: missing }, sourceVisible: true }, data: { sourceVisible: false, sourceHash: null } });
          if (options.checkpoint) await tx.sourceConnection.update({ where: { id: connectionId }, data: { lastSyncAt: run.startedAt } });
          return tx.syncRun.update({ where: { id: run.id }, data: { updatedCount: counts.updatedCount + hidden.count } });
        });
      }
    } catch (error) { counts.failedCount++; errorSummary = error instanceof IntegrationError ? error.message : "Import interrupted. Existing catalog data was preserved."; }
    await prisma.syncRun.updateMany({ where: { id: run.id, status: "RUNNING" }, data: { ...counts, status: "FAILED", errorSummary, completedAt: new Date() } });
    return prisma.syncRun.findUniqueOrThrow({ where: { id: run.id } });
  } finally {
    if (acquired) await lock.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [connectionId]).catch(() => {});
    lock.release(true);
  }
}

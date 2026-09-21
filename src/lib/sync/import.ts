import "server-only";
import { Pool } from "pg";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import { IntegrationError } from "@/lib/integrations/errors";
import type { SourceProduct } from "@/lib/integrations/product";
import { persistSourceProduct } from "./persist";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
export type SourceReader = () => AsyncIterable<(SourceProduct | IntegrationError)[]>;
export async function runImport(connectionId: string, read: SourceReader) {
  const lock = await pool.connect(); let acquired = false;
  try {
    acquired = (await lock.query("SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked", [connectionId])).rows[0].locked;
    if (!acquired) throw new ApiError(409, "This source is already importing.");
    const connection = await prisma.sourceConnection.findUnique({ where: { id: connectionId } });
    if (!connection?.enabled || !connection.verifiedAt) throw new ApiError(409, "Enable and verify the configured source first.");
    await prisma.syncRun.updateMany({ where: { sourceConnectionId: connectionId, status: "RUNNING" }, data: { status: "FAILED", completedAt: new Date(), errorSummary: "Previous run was interrupted; safe to retry." } });
    const run = await prisma.syncRun.create({ data: { sourceConnectionId: connectionId, status: "RUNNING" } });
    const counts = { importedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0 }; let errorSummary: string | null = null;
    try {
      let processed = 0;
      for await (const page of read()) {
        if (Date.now() - run.startedAt.getTime() > 10 * 60 * 1000 || processed + page.length > 1000) throw new IntegrationError("PAGINATION");
        for (const product of page) {
          if (Date.now() - run.startedAt.getTime() > 10 * 60 * 1000) throw new IntegrationError("TIMEOUT");
          processed++;
          try { if (product instanceof IntegrationError) throw product; const result = await persistSourceProduct(connectionId, product); counts[`${result}Count`]++; }
          catch { counts.failedCount++; errorSummary = "One or more source records could not be imported. Correct source data and retry."; }
        }
        await prisma.syncRun.update({ where: { id: run.id }, data: counts });
      }
    } catch (error) { counts.failedCount++; errorSummary = error instanceof IntegrationError ? error.message : "Import interrupted. Existing catalog data was preserved."; }
    return await prisma.syncRun.update({ where: { id: run.id }, data: { ...counts, status: counts.failedCount ? "FAILED" : "SUCCEEDED", errorSummary, completedAt: new Date() } });
  } finally {
    if (acquired) await lock.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [connectionId]).catch(() => {});
    lock.release(true);
  }
}

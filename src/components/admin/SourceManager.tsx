"use client";
import { useEffect, useState } from "react";
type Run = { id: string; status: string; importedCount: number; updatedCount: number; skippedCount: number; failedCount: number; errorSummary: string | null; startedAt: string; completedAt: string | null };
type Source = { id: string; provider: string; storeUrl: string; enabled: boolean; verifiedAt: string | null; lastSyncAt: string | null; _count: { products: number }; syncRuns: Run[] };
export function SourceManager() {
  const [sources, setSources] = useState<Source[]>([]), [status, setStatus] = useState("Loading source connections…"), [busy, setBusy] = useState(false);
  async function refresh() { const response = await fetch("/api/admin/sources", { cache: "no-store" }); if (!response.ok) throw new Error("Could not load sources. Check your administrator session."); setSources((await response.json()).data); }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/sources", { cache: "no-store", signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("Could not load sources. Check your administrator session."); return response.json(); }).then((result) => { setSources(result.data); setStatus(""); }).catch(() => { if (!controller.signal.aborted) setStatus("Could not load source connections. Please refresh."); });
    return () => controller.abort();
  }, []);
  async function action(path: string, body: unknown) {
    setBusy(true); setStatus("Working… Keep this page open. Completed records are saved independently.");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Operation failed.");
      setStatus(result.data?.status === "FAILED" ? "Import failed or was incomplete. See run history; existing data is preserved." : "Operation completed."); await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Operation failed."); }
    finally { setBusy(false); }
  }
  return <section className="mt-10 grid gap-4"><h2 className="text-xl font-semibold">Commerce sources</h2><p className="text-sm">Store setup and credentials are configured on the server, never entered here. Live verification is deferred until external setup.</p>
    <button className="button button-secondary" disabled={busy} onClick={() => { if (window.confirm("Check the server-configured Shopify store and register it for imports?")) void action("/api/admin/sources", { provider: "SHOPIFY" }); }}>Connect configured Shopify store</button>
    <p role="status" className="text-sm">{status}</p>
    {!sources.length && <p>No verified source connections yet.</p>}
    {sources.map((source) => <article key={source.id} className="rounded border border-amber-300 p-4"><h3 className="font-semibold">{source.provider}</h3><p className="break-all text-sm">{source.storeUrl}</p><p className="text-sm">{source.enabled ? "Enabled" : "Disabled"} · {source._count.products} imported products</p>
      <button className="button mt-3" disabled={busy || !source.enabled} onClick={() => { if (window.confirm("Import source-owned product data? Local visibility and featured settings will be preserved.")) void action(`/api/admin/sources/${source.id}/import`, { confirm: true }); }}>Import products</button>
      <h4 className="mt-4 font-semibold">Recent runs</h4>{source.syncRuns.length === 0 ? <p>No imports yet.</p> : source.syncRuns.map((run) => <div key={run.id} className="mt-3 border-t pt-2 text-sm"><p>{run.status} · {new Date(run.startedAt).toLocaleString()}</p><p>{run.importedCount} new · {run.updatedCount} updated · {run.skippedCount} unchanged · {run.failedCount} failed</p>{run.errorSummary && <p>{run.errorSummary}</p>}</div>)}
    </article>)}
    <button className="button button-secondary" disabled={busy} onClick={() => refresh().catch((error) => setStatus(error.message))}>Refresh source status</button>
  </section>;
}

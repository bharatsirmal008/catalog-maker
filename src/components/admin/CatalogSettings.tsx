"use client";
import { useState } from "react";
import type { CatalogConfigData } from "@/types/catalog";
export function CatalogSettings({ config }: { config: CatalogConfigData }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setStatus("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/config", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessName: fields.get("businessName"), whatsappNumber: String(fields.get("whatsappNumber") || "").trim() || null, activeTemplate: "GRID" }) });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again." : "Settings were not saved. Check the name and international phone digits.");
      setStatus("Settings saved. The catalog will use these contact details.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setPending(false); }
  }
  return <form onSubmit={save} className="mt-8 grid gap-4"><h2 className="text-xl font-semibold">Catalog settings</h2>
    <label className="grid gap-2">Business name<input className="rounded border bg-white p-3" name="businessName" defaultValue={config.businessName} required maxLength={100} /></label>
    <label className="grid gap-2">WhatsApp number<input className="rounded border bg-white p-3" name="whatsappNumber" type="tel" inputMode="numeric" pattern="[1-9][0-9]{6,14}" defaultValue={config.whatsappNumber ?? ""} aria-describedby="phone-help" /></label>
    <p id="phone-help" className="text-sm">International digits only, including country code, without + or spaces. Leave blank to disable WhatsApp enquiries. Use a number you control.</p>
    <button className="button" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button><p role="status">{status}</p>
  </form>;
}

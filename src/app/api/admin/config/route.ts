import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { getCatalogConfig, saveCatalogConfig } from "@/lib/catalog/catalog.service";
import { catalogSettings } from "@/lib/validations/catalog";
export async function GET() { return endpoint(async () => { await requireAdmin(); return json({ data: await getCatalogConfig() }); }); }
export async function PATCH(request: Request) { return endpoint(async () => { await requireAdmin(request); return json({ data: await saveCatalogConfig(catalogSettings.parse(await readJson(request))) }); }); }

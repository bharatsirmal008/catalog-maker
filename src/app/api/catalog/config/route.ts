import { endpoint, json } from "@/lib/api/http";
import { getCatalogConfig } from "@/lib/catalog/catalog.service";
export const dynamic = "force-dynamic";
export async function GET() { return endpoint(async () => json({ data: await getCatalogConfig() })); }

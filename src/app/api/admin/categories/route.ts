import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { createCategory } from "@/lib/validations/catalog";
import { listCategories, writeCategory } from "@/lib/catalog/category.service";
export async function GET() { return endpoint(async () => { await requireAdmin(); const result = await listCategories(true); return json({ data: result }); }); }
export async function POST(request: Request) { return endpoint(async () => { await requireAdmin(request); const input = createCategory.parse(await readJson(request)); return json({ data: await writeCategory(input) }, 201); }); }

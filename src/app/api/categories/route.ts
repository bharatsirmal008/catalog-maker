import { endpoint, json } from "@/lib/api/http";
import { listCategories } from "@/lib/catalog/category.service";
import { categoryQuery } from "@/lib/validations/catalog";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return endpoint(async () => { const q = categoryQuery.parse(Object.fromEntries(new URL(request.url).searchParams)); return json({ data: await listCategories(false, q.parentId) }); }); }

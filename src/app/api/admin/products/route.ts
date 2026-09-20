import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { createProduct, productQuery } from "@/lib/validations/catalog";
import { listProducts, writeProduct } from "@/lib/catalog/product.service";
export async function GET(request: Request) { return endpoint(async () => { await requireAdmin(); const result = await listProducts(productQuery.parse(Object.fromEntries(new URL(request.url).searchParams)), true); return json(result); }); }
export async function POST(request: Request) { return endpoint(async () => { await requireAdmin(request); const input = createProduct.parse(await readJson(request)); return json({ data: await writeProduct(input) }, 201); }); }

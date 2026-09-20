import { endpoint, json } from "@/lib/api/http";
import { listProducts } from "@/lib/catalog/product.service";
import { productQuery } from "@/lib/validations/catalog";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return endpoint(async () => json(await listProducts(productQuery.parse(Object.fromEntries(new URL(request.url).searchParams))))); }

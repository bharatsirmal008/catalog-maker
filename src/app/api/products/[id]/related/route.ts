import { endpoint, json, ApiError } from "@/lib/api/http";
import { relatedProducts } from "@/lib/catalog/product.service";
import { uuid } from "@/lib/validations/catalog";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { return endpoint(async () => { const { id } = await context.params; if (!uuid.safeParse(id).success) throw new ApiError(404, "Product not found"); return json({ data: await relatedProducts(id) }); }); }

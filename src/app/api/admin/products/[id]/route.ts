import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { updateProduct, uuid } from "@/lib/validations/catalog";
import { writeProduct, deleteProduct } from "@/lib/catalog/product.service";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { return endpoint(async () => { await requireAdmin(request); const id = uuid.parse((await context.params).id); return json({ data: await writeProduct(updateProduct.parse(await readJson(request)), id) }); }); }
export async function DELETE(request: Request, context: Context) { return endpoint(async () => { await requireAdmin(request); const id = uuid.parse((await context.params).id); await deleteProduct(id); return json({ data: { deleted: true } }); }); }

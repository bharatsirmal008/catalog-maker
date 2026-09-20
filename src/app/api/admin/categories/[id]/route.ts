import { endpoint, json, readJson } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { updateCategory, uuid } from "@/lib/validations/catalog";
import { writeCategory, deleteCategory } from "@/lib/catalog/category.service";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { return endpoint(async () => { await requireAdmin(request); const id = uuid.parse((await context.params).id); return json({ data: await writeCategory(updateCategory.parse(await readJson(request)), id) }); }); }
export async function DELETE(request: Request, context: Context) { return endpoint(async () => { await requireAdmin(request); const id = uuid.parse((await context.params).id); await deleteCategory(id); return json({ data: { deleted: true } }); }); }

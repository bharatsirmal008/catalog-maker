import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/http";
import type { CategoryInput, CategoryUpdate } from "@/lib/validations/catalog";
import { uniqueSlug } from "./slug";

export const categorySelect = { id: true, name: true, slug: true, parentId: true, displayOrder: true } as const;
// A hidden ancestor hides its subtree. Explicit filtering includes only the selected category.
export async function listCategories(admin = false, parentId?: string) {
  const all = await prisma.category.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }, { id: "asc" }] });
  const byId = new Map(all.map((c) => [c.id, c]));
  return all.filter((c) => {
    if (parentId && c.parentId !== parentId) return false;
    if (admin) return true;
    const seen = new Set<string>();
    let node: typeof c | undefined = c;
    while (node) {
      if (!node.isVisible || seen.has(node.id)) return false;
      seen.add(node.id);
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
    return true;
  }).map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId, displayOrder: c.displayOrder, ...(admin ? { isVisible: c.isVisible } : {}) }));
}
export async function writeCategory(data: CategoryInput | CategoryUpdate, id?: string) {
  return prisma.$transaction(async (tx) => {
    // Serialize hierarchy mutations so concurrent reparenting cannot introduce a cycle.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7438291)`;
    if (id && !await tx.category.findUnique({ where: { id } })) throw new ApiError(404, "Category not found");
    if (data.parentId) {
      const visited = new Set(id ? [id] : []);
      let parent: string | null = data.parentId;
      while (parent) {
        if (visited.has(parent)) throw new ApiError(400, "Category hierarchy cannot contain a cycle");
        visited.add(parent);
        const item: { parentId: string | null } | null = await tx.category.findUnique({ where: { id: parent }, select: { parentId: true } });
        if (!item) throw new ApiError(400, "Parent category does not exist");
        parent = item.parentId;
      }
    }
    return id ? tx.category.update({ where: { id }, data }) :
      tx.category.create({ data: { ...data as CategoryInput, slug: data.slug ?? uniqueSlug(data.name!) } });
  });
}
export async function deleteCategory(id: string) {
  // Existing FK SET NULL behavior preserves products and reparents children to the root.
  return prisma.category.delete({ where: { id } });
}

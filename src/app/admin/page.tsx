import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/session";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { CatalogSettings } from "@/components/admin/CatalogSettings";
import { getCatalogConfig } from "@/lib/catalog/catalog.service";
import { SourceManager } from "@/components/admin/SourceManager";
import { ProductManager } from "@/components/admin/ProductManager";
import { prisma } from "@/lib/db/prisma";
import { listProducts } from "@/lib/catalog/product.service";
import { productQuery } from "@/lib/validations/catalog";

export const metadata = {
  title: "Admin access | CM",
};

export default async function AdminPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  const config = await getCatalogConfig();
  const [total, visible, categories, sources, local] = await Promise.all([prisma.product.count(), listProducts(productQuery.parse({ limit: 1 })), prisma.category.count(), prisma.sourceConnection.findMany({ select: { id: true, provider: true, _count: { select: { products: true } } } }), prisma.product.count({ where: { sourceConnectionId: null } })]);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-12">
      <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">
          Authenticated administrator
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Catalog administration</h1>
        <p className="mt-4 leading-7 text-slate-700">
          Signed in as {admin.email}. Manage your catalog and connected stores.
        </p>
        <Link className="mt-7 inline-block font-semibold text-teal-800 hover:underline" href="/">
          Return to catalog
        </Link>
        <CatalogSettings config={config} />
        <section className="mt-8 rounded border p-4"><h2 className="text-xl font-semibold">Overview</h2><p>{total} total products · {visible.pagination.total} publicly visible · {categories} categories</p><p>{local} local products</p>{sources.map((source) => <p key={source.id}>{source.provider}: {source._count.products} imported products</p>)}</section>
        <SourceManager />
        <ProductManager />
        <div className="mt-6"><LogoutButton /></div>
      </section>
    </main>
  );
}

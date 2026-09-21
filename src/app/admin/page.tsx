import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/session";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { CatalogSettings } from "@/components/admin/CatalogSettings";
import { getCatalogConfig } from "@/lib/catalog/catalog.service";
import { SourceManager } from "@/components/admin/SourceManager";

export const metadata = {
  title: "Admin access | Catalog Maker",
};

export default async function AdminPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  const config = await getCatalogConfig();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">
          Authenticated administrator
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Administrator access</h1>
        <p className="mt-4 leading-7 text-slate-700">
          Signed in as {admin.email}. Product and category management APIs are available.
          See the Day 2 API guide for request examples.
        </p>
        <Link className="mt-7 inline-block font-semibold text-teal-800 hover:underline" href="/">
          Return to catalog
        </Link>
        <CatalogSettings config={config} />
        <SourceManager />
        <div className="mt-6"><LogoutButton /></div>
      </section>
    </main>
  );
}

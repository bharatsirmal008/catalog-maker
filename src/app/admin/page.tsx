import Link from "next/link";

export const metadata = {
  title: "Admin access | Catalog Maker",
};

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">
          Restricted area
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Administrator access</h1>
        <p className="mt-4 leading-7 text-slate-700">
          Management tools are disabled until server-side authentication is implemented.
          This placeholder exposes no product, connection, synchronization, or configuration controls.
        </p>
        <Link className="mt-7 inline-block font-semibold text-teal-800 hover:underline" href="/">
          Return to catalog
        </Link>
      </section>
    </main>
  );
}

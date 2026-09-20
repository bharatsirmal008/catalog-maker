import Link from "next/link";

export default function CatalogHomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <nav className="flex items-center justify-between border-b border-slate-200 pb-5">
        <span className="text-lg font-bold tracking-tight text-slate-950">
          Catalog Maker
        </span>
        <Link
          href="/admin"
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
        >
          Admin
        </Link>
      </nav>

      <section className="flex flex-1 flex-col justify-center py-16 sm:py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
          High-speed product catalog platform
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Products worth discovering, delivered fast.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          The catalog foundation is ready. Categories, search, and synchronized
          products will appear here in the next milestones.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Catalog status">
          {[
            ["Categories", "Coming soon"],
            ["Products", "No products imported"],
            ["Search", "Coming soon"],
          ].map(([title, status]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-500">{status}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

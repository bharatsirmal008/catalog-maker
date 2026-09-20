import Link from "next/link";
import { notFound } from "next/navigation";
import { listCategories } from "@/lib/catalog/category.service";
import { listProducts } from "@/lib/catalog/product.service";
import { productQuery } from "@/lib/validations/catalog";
import { CatalogFilters } from "./CatalogFilters";
import { ProductGrid } from "./ProductGrid";
import { EmptyState, ErrorState } from "./States";
type Search = Record<string, string | string[] | undefined>;
export async function CatalogListing({ search, categorySlug }: { search: Search; categorySlug?: string }) {
  const clean = Object.fromEntries(Object.entries(search).filter(([, value]) => value !== "" && value !== undefined));
  const parsed = productQuery.safeParse({ ...clean, ...(categorySlug ? { category: categorySlug } : {}) });
  if (!parsed.success) return <EmptyState title="These filters aren’t valid" message="Please clear the filters and try again." />;
  let categories, result;
  try { [categories, result] = await Promise.all([listCategories(), listProducts(parsed.data)]); } catch { return <ErrorState />; }
  const currentCategory = categories.find((c) => c.slug === categorySlug);
  if (categorySlug && !currentCategory) notFound();
  const path = categorySlug ? `/categories/${categorySlug}` : "/";
  const pageLink = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(clean)) if (typeof value === "string" && key !== "page") params.set(key, value);
    params.set("page", String(page)); return path + "?" + params;
  };
  return <>
    <section className="catalog-hero">
      <div><p className="eyebrow">THE EVERYDAY EDIT · VOL. 01</p><h1>{currentCategory ? currentCategory.name : <>Good things.<br /><em>Every day.</em></>}</h1></div>
      <p className="hero-copy">{currentCategory ? "Explore considered pieces from this collection. Find something that fits your everyday." : "A considered collection of useful, beautiful things. Find your favourites, ask a question, make them yours."}</p>
    </section>
    <nav className="category-nav" aria-label="Browse categories"><Link className={!categorySlug ? "active" : ""} href="/">All pieces</Link>{categories.map((c) => <Link key={c.id} className={c.slug === categorySlug ? "active" : ""} href={`/categories/${c.slug}`}>{c.parentId ? "↳ " : ""}{c.name}</Link>)}</nav>
    <CatalogFilters key={JSON.stringify(parsed.data)} categories={categories} query={parsed.data} action={path} />
    <section aria-label="Product collection">
      <div className="collection-title"><h2>{parsed.data.q ? `Results for “${parsed.data.q}”` : "Discover the collection"}</h2><span>{result.pagination.total} pieces</span></div>
      {result.data.length ? <ProductGrid products={result.data} /> : <EmptyState title={parsed.data.q ? "No matching pieces" : "This collection is coming soon"} />}
      {result.pagination.totalPages > 1 && <nav aria-label="Pagination" className="pagination">
        {parsed.data.page > 1 && <Link className="button button-secondary" href={pageLink(parsed.data.page - 1)}>← Previous</Link>}
        <span>Page {parsed.data.page} of {result.pagination.totalPages}</span>
        {parsed.data.page < result.pagination.totalPages && <Link className="button button-secondary" href={pageLink(parsed.data.page + 1)}>Next →</Link>}
      </nav>}
    </section>
  </>;
}

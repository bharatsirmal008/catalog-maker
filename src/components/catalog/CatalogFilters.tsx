import Link from "next/link";
import type { CategoryData } from "@/types/catalog";
import type { ProductQuery } from "@/lib/validations/catalog";
export function CatalogFilters({ categories, query, action = "/" }: { categories: CategoryData[]; query: ProductQuery; action?: string }) {
  return <form action={action} className="filter-form" role="search">
    <div className="search-field"><label htmlFor="product-search" className="sr-only">Search products</label><span aria-hidden="true">⌕</span><input id="product-search" name="q" defaultValue={query.q} placeholder="Find your next everyday favourite" maxLength={100} /></div>
    {action === "/" && <label className="filter-label">Category<select name="category" defaultValue={query.category ?? ""}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.parentId ? "↳ " : ""}{c.name}</option>)}</select></label>}
    <label className="filter-label">Availability<select name="available" defaultValue={query.available ?? ""}><option value="">All products</option><option value="true">In stock</option><option value="false">Not in stock</option></select></label>
    <label className="filter-label">Sort by<select name="sort" defaultValue={query.sort}><option value="featured">Featured</option><option value="newest">Newest</option><option value="name_asc">Name A–Z</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
    <button className="button" type="submit">Find products <span aria-hidden="true">↗</span></button>
    {(query.q || query.available || query.category) && <Link href={action} className="clear-link">Clear filters</Link>}
  </form>;
}

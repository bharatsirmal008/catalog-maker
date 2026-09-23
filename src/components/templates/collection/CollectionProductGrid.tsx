import Link from "next/link";
import type { ProductCardData } from "@/types/catalog";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { ProductActions } from "@/components/catalog/ProductActions";
import { PriceDisplay } from "@/components/catalog/PriceDisplay";
import { AvailabilityBadge } from "@/components/catalog/AvailabilityBadge";
export function CollectionProductGrid({ products }: { products: ProductCardData[] }) {
  // Group only adjacent categories, preserving the server's global sort order.
  const groups: { name: string; rows: ProductCardData[] }[] = [];
  for (const product of products) { const name = product.category?.name ?? "Selected pieces"; const last = groups[groups.length - 1]; if (last?.name === name) last.rows.push(product); else groups.push({ name, rows: [product] }); }
  return <div className="collection-groups">{groups.map(({ name, rows }, groupIndex) => <section className="editorial-group" key={`${name}-${groupIndex}`}><div className="editorial-group-heading"><h3>{name}</h3><span>{rows.length} on this page</span></div><div className="editorial-grid">{rows.map((product, index) => <article className="editorial-card" key={product.id}><Link className="editorial-image" href={`/products/${product.id}`} aria-label={`View ${product.name}`}><CatalogImage src={product.images[0]?.imageUrl} alt={product.images[0]?.altText || product.name} sizes="(max-width: 639px) 100vw, 50vw" /></Link><div className="editorial-card-copy"><span className="editorial-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h4><Link href={`/products/${product.id}`}>{product.name}</Link></h4><div className="editorial-meta"><PriceDisplay price={product.price} currency={product.currency} /><AvailabilityBadge value={product.availability} /></div><ProductActions id={product.id} name={product.name} /></div></div></article>)}</div></section>)}</div>;
}

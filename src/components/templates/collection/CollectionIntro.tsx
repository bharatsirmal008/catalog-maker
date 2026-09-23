import Link from "next/link";
import type { ProductCardData, CategoryData } from "@/types/catalog";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { PriceDisplay } from "@/components/catalog/PriceDisplay";
export function CollectionIntro({ products, categories, title, showcase }: { products: ProductCardData[]; categories: CategoryData[]; title?: string; showcase: boolean }) {
  const featured = products[0];
  if (!showcase || !featured) return <header className="collection-heading"><p className="eyebrow">THE COLLECTION JOURNAL</p><h1>{title ?? "Explore the collection"}</h1><a href="#collection-results">Browse the pieces ↓</a></header>;
  const visualCategories = categories.flatMap((category) => { const product = products.find((p) => p.category?.id === category.id && p.images.length); return product ? [{ category, product }] : []; }).slice(0, 3);
  return <><section className="showcase-hero"><div className="showcase-copy"><p className="eyebrow">THE COLLECTION JOURNAL</p><h1>Objects for<br /><em>living well.</em></h1><p>Explore the details. Find the pieces that belong in your everyday.</p><a className="button" href="#collection-results">Explore all pieces</a></div><Link className="showcase-feature" href={`/products/${featured.id}`} aria-label={`Featured piece: ${featured.name}`}><div className="showcase-feature-image"><CatalogImage src={featured.images[0]?.imageUrl} alt={featured.images[0]?.altText || featured.name} sizes="(max-width: 767px) 100vw, 60vw" priority /></div><div className="showcase-caption"><span>{featured.name}</span><PriceDisplay price={featured.price} currency={featured.currency} /></div></Link></section>
    {!!visualCategories.length && <section className="visual-collections" aria-label="Explore collections">{visualCategories.map(({ category, product }) => <Link className="visual-collection" key={category.id} href={`/categories/${category.slug}`}><div className="visual-collection-image"><CatalogImage src={product.images[0].imageUrl} alt={product.images[0].altText || product.name} sizes="(max-width: 639px) 80vw, 30vw" /></div><span>{category.name} <span aria-hidden="true">↗</span></span></Link>)}</section>}</>;
}

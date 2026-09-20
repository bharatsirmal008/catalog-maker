import Link from "next/link";
import type { ProductCardData } from "@/types/catalog";
import { CatalogImage } from "./CatalogImage";
import { PriceDisplay } from "./PriceDisplay";
import { AvailabilityBadge } from "./AvailabilityBadge";
export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  return <article className="product-card">
    <Link href={`/products/${product.id}`} className="product-image" aria-label={`View ${product.name}`}>
      <CatalogImage src={image?.imageUrl} alt={image?.altText || product.name} />
      <span className="image-arrow" aria-hidden="true">↗</span>
    </Link>
    <div className="product-card-info">
      <p className="eyebrow">{product.category?.name ?? "The collection"}</p>
      <h3><Link href={`/products/${product.id}`}>{product.name}</Link></h3>
      <div className="product-card-meta"><PriceDisplay price={product.price} currency={product.currency} /><AvailabilityBadge value={product.availability} /></div>
    </div>
  </article>;
}

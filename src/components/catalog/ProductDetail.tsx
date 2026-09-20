"use client";
import { useState } from "react";
import Link from "next/link";
import type { ProductDetailData } from "@/types/catalog";
import { CatalogImage } from "./CatalogImage";
import { PriceDisplay } from "./PriceDisplay";
import { AvailabilityBadge } from "./AvailabilityBadge";
export function ProductDetail({ product }: { product: ProductDetailData }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const variant = product.variants.find((v) => v.id === variantId);
  const image = product.images[0];
  const available = product.availability !== "IN_STOCK" ? product.availability : variant?.stockQuantity === 0 ? "OUT_OF_STOCK" : product.availability;
  return <section className="product-detail">
    <div><div className="detail-image"><CatalogImage src={image?.imageUrl} alt={image?.altText || product.name} sizes="(max-width: 767px) 100vw, 55vw" priority /></div>
      {product.images.length > 1 && <div className="thumbnail-row">{product.images.map((img) => <div className="thumbnail" key={img.id}><CatalogImage src={img.imageUrl} alt={img.altText || product.name} sizes="80px" /></div>)}</div>}
    </div>
    <div className="detail-copy">
      <p className="eyebrow">{product.category ? <Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link> : "The collection"}</p>
      <h1>{product.name}</h1><div className="detail-price"><PriceDisplay price={variant?.price ?? product.price} currency={product.currency} /><AvailabilityBadge value={available} /></div>
      <p className="product-description">{product.description || "A little more detail is on its way. Contact us to learn more about this piece."}</p>
      {product.variants.length > 0 && <label className="variant-select">Choose an option<select value={variantId} onChange={(e) => setVariantId(e.target.value)}>{product.variants.map((v) => <option key={v.id} value={v.id}>{v.title}{v.stockQuantity === 0 ? " — out of stock" : ""}</option>)}</select></label>}
      {(variant?.sku || product.sku) && <p className="sku">SKU: {variant?.sku || product.sku}</p>}
      <div className="detail-note"><span aria-hidden="true">↗</span><p>Something caught your eye?<br /><strong>Save it for your next enquiry.</strong></p></div>
    </div>
  </section>;
}

"use client";
import { useState } from "react";
import Link from "next/link";
import type { ProductDetailData } from "@/types/catalog";
import { ProductGallery } from "./ProductGallery";
import { ProductActions } from "./ProductActions";
import { PriceDisplay } from "./PriceDisplay";
import { AvailabilityBadge } from "./AvailabilityBadge";
export function ProductDetail({ product }: { product: ProductDetailData }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const variant = product.variants.find((v) => v.id === variantId);
  const available = product.availability === "UNAVAILABLE" ? "UNAVAILABLE" : variant?.availability ?? (product.availability !== "IN_STOCK" ? product.availability : variant?.stockQuantity === 0 ? "OUT_OF_STOCK" : product.availability);
  return <section className="product-detail">
    <ProductGallery key={product.id} images={product.images} name={product.name} />
    <div className="detail-copy">
      <p className="eyebrow">{product.category ? <Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link> : "The collection"}</p>
      <h1>{product.name}</h1><div className="detail-price"><PriceDisplay price={variant?.price ?? product.price} currency={product.currency} /><AvailabilityBadge value={available} /></div>
      <p className="product-description">{product.description || "A little more detail is on its way. Contact us to learn more about this piece."}</p>
      {product.variants.length > 0 && <label className="variant-select">Choose an option<select value={variantId} onChange={(e) => setVariantId(e.target.value)}>{product.variants.map((v) => <option key={v.id} value={v.id}>{v.title}{v.stockQuantity === 0 ? " — out of stock" : ""}</option>)}</select></label>}
      {(variant?.sku || product.sku) && <p className="sku">SKU: {variant?.sku || product.sku}</p>}
      <ProductActions id={product.id} name={product.name} />
      <div className="detail-note"><span aria-hidden="true">↗</span><p>Save this product or ask about it.<br /><strong>Enquiries use the base product price. Confirm sizes and options with us.</strong></p></div>
    </div>
  </section>;
}

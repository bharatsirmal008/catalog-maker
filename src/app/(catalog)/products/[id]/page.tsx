import Link from "next/link";
import { notFound } from "next/navigation";
import { productDetail, relatedProducts } from "@/lib/catalog/product.service";
import { uuid } from "@/lib/validations/catalog";
import { ApiError } from "@/lib/api/http";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ErrorState } from "@/components/catalog/States";
import { getCatalogConfig } from "@/lib/catalog/catalog.service";
import { CollectionProductDetail } from "@/components/templates/collection/CollectionProductDetail";
import { CollectionProductGrid } from "@/components/templates/collection/CollectionProductGrid";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  let product, related, config;
  try { [product, config] = await Promise.all([productDetail(id), getCatalogConfig()]); related = await relatedProducts(id, product); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); return <ErrorState />; }
  return <><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">The collection</Link><span>/</span><span>{product.name}</span></nav>{config.activeTemplate === "COLLECTION" ? <CollectionProductDetail product={product} /> : <ProductDetail product={product} />}{related.length > 0 && <section className="related-section"><div className="collection-title"><h2>A little more to love</h2><span>Related pieces</span></div>{config.activeTemplate === "COLLECTION" ? <CollectionProductGrid products={related} /> : <ProductGrid products={related} />}</section>}</>;
}

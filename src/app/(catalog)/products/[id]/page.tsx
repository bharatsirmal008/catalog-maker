import Link from "next/link";
import { notFound } from "next/navigation";
import { productDetail, relatedProducts } from "@/lib/catalog/product.service";
import { uuid } from "@/lib/validations/catalog";
import { ApiError } from "@/lib/api/http";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ErrorState } from "@/components/catalog/States";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  let product, related;
  try { [product, related] = await Promise.all([productDetail(id), relatedProducts(id)]); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); return <ErrorState />; }
  return <><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">The collection</Link><span>/</span><span>{product.name}</span></nav><ProductDetail product={product} />{related.length > 0 && <section className="related-section"><div className="collection-title"><h2>A little more to love</h2><span>Related pieces</span></div><ProductGrid products={related} /></section>}</>;
}

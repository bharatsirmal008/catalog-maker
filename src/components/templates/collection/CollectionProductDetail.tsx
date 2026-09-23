import type { ProductDetailData } from "@/types/catalog";
import { ProductDetail } from "@/components/catalog/ProductDetail";
export function CollectionProductDetail({ product }: { product: ProductDetailData }) {
  return <div className="collection-detail"><p className="collection-detail-label">A CLOSER LOOK <span>{product.category?.name ?? "The collection"}</span></p><ProductDetail product={product} /></div>;
}

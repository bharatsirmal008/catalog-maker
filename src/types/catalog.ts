import type { listProducts, productDetail } from "@/lib/catalog/product.service";
import type { listCategories } from "@/lib/catalog/category.service";
import type { getCatalogConfig } from "@/lib/catalog/catalog.service";
export type ProductList = Awaited<ReturnType<typeof listProducts>>;
export type ProductCardData = ProductList["data"][number];
export type ProductDetailData = Awaited<ReturnType<typeof productDetail>>;
export type CategoryData = Awaited<ReturnType<typeof listCategories>>[number];
export type CatalogConfigData = Awaited<ReturnType<typeof getCatalogConfig>>;

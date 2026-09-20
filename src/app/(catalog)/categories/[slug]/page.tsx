import { CatalogListing } from "@/components/catalog/CatalogListing";
export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogListing search={await searchParams} categorySlug={(await params).slug} />;
}

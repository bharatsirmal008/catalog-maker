import { CatalogListing } from "@/components/catalog/CatalogListing";
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <CatalogListing search={await searchParams} />; }

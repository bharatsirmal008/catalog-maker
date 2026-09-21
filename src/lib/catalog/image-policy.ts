export function allowedCatalogImage(src: string | null | undefined) {
  if (!src) return false;
  if (src.startsWith("/demo/") && !src.includes("..")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === "images.unsplash.com") return true;
    if (url.hostname === "cdn.shopify.com" && url.pathname.startsWith("/s/files/")) return true;
    return !!process.env.NEXT_PUBLIC_CATALOG_WOO_ORIGIN && url.origin === process.env.NEXT_PUBLIC_CATALOG_WOO_ORIGIN && url.pathname.startsWith("/wp-content/uploads/");
  } catch { return false; }
}

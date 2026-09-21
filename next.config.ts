import type { NextConfig } from "next";
const wooUrl = process.env.WOOCOMMERCE_STORE_URL ? new URL(process.env.WOOCOMMERCE_STORE_URL) : null;
const wooOrigin = wooUrl?.protocol === "https:" && !wooUrl.username && !wooUrl.password && !wooUrl.port ? wooUrl.origin : "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_CATALOG_WOO_ORIGIN: wooOrigin },
  images: { maximumRedirects: 0, remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }, ...(wooOrigin ? [{ protocol: "https" as const, hostname: wooUrl!.hostname, pathname: "/wp-content/uploads/**" }] : [])] },
};

export default nextConfig;

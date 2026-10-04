import type { NextConfig } from "next";
const wooUrl = process.env.WOOCOMMERCE_STORE_URL ? new URL(process.env.WOOCOMMERCE_STORE_URL) : null;
const wooOrigin = wooUrl?.protocol === "https:" && !wooUrl.username && !wooUrl.password && !wooUrl.port ? wooUrl.origin : "";
const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? "";
if (cloud && !/^[a-zA-Z0-9_-]+$/.test(cloud)) throw new Error("Invalid CLOUDINARY_CLOUD_NAME");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_CATALOG_WOO_ORIGIN: wooOrigin, NEXT_PUBLIC_CATALOG_CLOUDINARY_CLOUD_NAME: cloud },
  images: { maximumRedirects: 0, remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }, ...(cloud ? [{ protocol: "https" as const, hostname: "res.cloudinary.com", pathname: `/${cloud}/image/upload/**`, search: "" }] : []), ...(wooOrigin ? [{ protocol: "https" as const, hostname: wooUrl!.hostname, pathname: "/wp-content/uploads/**" }] : [])] },
};

export default nextConfig;

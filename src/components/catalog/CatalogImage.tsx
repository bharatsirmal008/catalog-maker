"use client";
import Image from "next/image";
import { useState } from "react";
export function CatalogImage({ src, alt, sizes = "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw", priority = false }: { src?: string | null; alt: string; sizes?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const allowed = src?.startsWith("/demo/") || src?.startsWith("https://images.unsplash.com/") || src?.startsWith("https://cdn.shopify.com/s/files/");
  if (!src || !allowed || failed) return <div className="image-fallback" role="img" aria-label={alt + " — image unavailable"}><span aria-hidden="true">◇</span><span>Image coming soon</span></div>;
  return <Image fill src={src} alt={alt} sizes={sizes} priority={priority} className="object-contain" onError={() => setFailed(true)} />;
}

export function cloudinaryImageUrl(value: string, cloud = process.env.NEXT_PUBLIC_CATALOG_CLOUDINARY_CLOUD_NAME) {
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password && !url.port && !url.search && !url.hash && url.pathname.startsWith(`/${cloud}/image/upload/`);
  } catch { return false; }
}

import { createHash, randomUUID } from "node:crypto";
import { endpoint, json, ApiError } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
import { MAX_IMAGE_BYTES, validImageBytes } from "@/lib/catalog/upload-validation";
import { cloudinaryImageUrl } from "@/lib/catalog/cloudinary-policy";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return endpoint(async () => {
    await requireAdmin(request);
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !key || !secret) throw new ApiError(409, "Cloudinary is not configured. Add server credentials, rebuild and restart the app.");
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new ApiError(415, "Send an image using multipart/form-data");
    const limit = MAX_IMAGE_BYTES + 65536;
    if (Number(request.headers.get("content-length")) > limit) throw new ApiError(413, "Image must be at most 5 MB");
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Choose an image");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new ApiError(413, "Image must be at most 5 MB"); }
      chunks.push(value);
    }
    let form: FormData;
    try { form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
    catch { throw new ApiError(400, "Invalid image upload"); }
    const file = form.get("file");
    if (!(file instanceof File) || form.getAll("file").length !== 1) throw new ApiError(400, "Choose one image");
    if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, "Image must be at most 5 MB");
    if (!validImageBytes(new Uint8Array(await file.arrayBuffer()), file.type)) throw new ApiError(400, "Choose a valid JPEG, PNG or WebP image (maximum 5 MB)");
    const params = { public_id: `catalog-maker/${randomUUID()}`, timestamp: String(Math.floor(Date.now()/1000)) };
    const signature = createHash("sha256").update(`public_id=${params.public_id}&timestamp=${params.timestamp}${secret}`).digest("hex");
    const body = new FormData(); body.set("file", file); body.set("api_key", key); body.set("signature", signature);
    for (const [name, value] of Object.entries(params)) body.set(name, value);
    let response: Response;
    try { response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(30000) }); }
    catch { throw new ApiError(502, "Image upload could not complete. Check Cloudinary before retrying."); }
    if (!response.ok) throw new ApiError(502, "Cloudinary rejected the image. Check server credentials and image format.");
    const result = await response.json();
    if (typeof result.secure_url !== "string" || !cloudinaryImageUrl(result.secure_url, cloud) || !["jpg", "jpeg", "png", "webp"].includes(result.format)) throw new ApiError(502, "Cloudinary returned an unsupported image");
    return json({ data: { imageUrl: result.secure_url, altText: null } }, 201);
  });
}

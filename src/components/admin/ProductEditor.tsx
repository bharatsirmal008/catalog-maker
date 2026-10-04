"use client";
import { useState } from "react";
import { CatalogImage } from "@/components/catalog/CatalogImage";
type Image = { imageUrl: string; altText?: string | null };
export type EditableProduct = { id: string; name: string; description?: string | null; price: string; currency: string; availability: string; images?: Image[] };
export function ProductEditor({ product, busy, save, cancel }: { product: EditableProduct | null; busy: boolean; save: (data: unknown) => Promise<void>; cancel: () => void }) {
  const [images, setImages] = useState<Image[]>(product?.images?.map(({ imageUrl, altText }) => ({ imageUrl, altText })) ?? []);
  const [uploading, setUploading] = useState(false), [message, setMessage] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Choose a JPEG, PNG or WebP image up to 5 MB."); return; }
    setUploading(true); setMessage("Uploading image…");
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/admin/images", { method: "POST", body }); const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Upload failed");
      setImages((current) => [...current, result.data]); setMessage("Image uploaded. Save the product to attach it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed"); }
    finally { setUploading(false); }
  }
  return <form className="grid gap-3 rounded border p-4" onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void save({ name: String(data.get("name")), description: String(data.get("description")).trim() || null, price: String(data.get("price")), currency: String(data.get("currency")), availability: String(data.get("availability")), images });
  }}>
    <h3 className="font-semibold">{product ? "Edit local product" : "Create local product"}</h3>
    <fieldset disabled={busy || uploading} className="grid gap-3">
      <label>Name<input className="block w-full rounded border bg-white p-3" name="name" defaultValue={product?.name} required maxLength={160} /></label>
      <label>Description<textarea className="block w-full rounded border bg-white p-3" name="description" defaultValue={product?.description ?? ""} rows={5} maxLength={10000} placeholder="Material, size, features and care instructions" /></label>
      <label>Price<input className="block w-full rounded border bg-white p-3" name="price" defaultValue={product?.price} required pattern="(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?" inputMode="decimal" /></label>
      <label>Currency<select className="ml-3 border bg-white p-3" name="currency" defaultValue={product?.currency ?? "INR"}>{["INR","USD","EUR","GBP"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Availability<select className="ml-3 border bg-white p-3" name="availability" defaultValue={product?.availability ?? "IN_STOCK"}>{["IN_STOCK","OUT_OF_STOCK","BACKORDER","UNAVAILABLE"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Product images<input className="block w-full p-3" type="file" accept="image/jpeg,image/png,image/webp" disabled={images.length >= 12} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
      <p className="text-sm">Up to 12 images, 5 MB each. The first image is the listing cover. Uploads are public on Cloudinary; do not upload private documents.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <div className="grid gap-2 rounded border p-2" key={image.imageUrl + index}>
        <div className="relative aspect-square"><CatalogImage src={image.imageUrl} alt={image.altText || "Product image"} sizes="200px" /></div>
        <label>Image description<input className="w-full rounded border p-2" maxLength={200} value={image.altText ?? ""} onChange={(event) => setImages((current) => current.map((item, i) => i === index ? { ...item, altText: event.target.value } : item))} /></label>
        <button className="button button-secondary" type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))}>Remove image {index + 1}</button>
        {index > 0 && <button className="button button-secondary" type="button" onClick={() => setImages((current) => [current[index], ...current.filter((_, i) => i !== index)])}>Make cover</button>}
      </div>)}</div>
      <button className="button">{busy ? "Saving…" : product ? "Save product" : "Create product"}</button>
      {product && <button type="button" className="button button-secondary" onClick={cancel}>Cancel editing</button>}
    </fieldset>
    <p role="status">{message}</p>
    <p className="text-sm">Removing an image here only detaches it when you save. Unused uploads remain in Cloudinary.</p>
  </form>;
}

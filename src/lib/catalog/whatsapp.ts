import type { ProductCardData } from "@/types/catalog";
import { formatPrice, stockLabel } from "./format";
export function makeWhatsAppEnquiry(number: string | null, products: ProductCardData[], origin: string) {
  if (!number || !/^[1-9]\d{6,14}$/.test(number)) throw new Error("WhatsApp enquiries are not configured yet. Please contact the business directly.");
  const unique = [...new Map(products.map((product) => [product.id, product])).values()];
  if (!unique.length) throw new Error("Select at least one product first.");
  const base = new URL(origin);
  if (!["https:", "http:"].includes(base.protocol)) throw new Error("The catalog address is invalid.");
  const message = ["Hi, I am interested in the following products:", "", ...unique.map((product, i) =>
    `${i + 1}. ${product.name} — ${formatPrice(product.price, product.currency)} (${stockLabel(product.availability)})\n   ${base.origin}/products/${encodeURIComponent(product.id)}`),
    "", "Please share more details and availability, including available sizes/options.", "Thank you."].join("\n");
  const url = `https://wa.me/${number}?${new URLSearchParams({ text: message })}`;
  if (url.length > 8000) throw new Error("This enquiry is too long for a reliable WhatsApp link. Please select fewer products and prepare it again. No products have been omitted.");
  return { url, message };
}

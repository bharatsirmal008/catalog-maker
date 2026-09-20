export function formatPrice(price: string, currency: string) {
  const value = Number(price);
  if (!Number.isFinite(value)) return "Price unavailable";
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
  catch { return `${price} ${currency}`; }
}
export function stockLabel(value: string) {
  return ({ IN_STOCK: "In stock", OUT_OF_STOCK: "Out of stock", BACKORDER: "Available on request", UNAVAILABLE: "Unavailable" } as Record<string, string>)[value] ?? "Unavailable";
}

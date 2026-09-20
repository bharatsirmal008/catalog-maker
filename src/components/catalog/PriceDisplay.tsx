import { formatPrice } from "@/lib/catalog/format";
export function PriceDisplay({ price, currency }: { price: string; currency: string }) { return <span className="price">{formatPrice(price, currency)}</span>; }

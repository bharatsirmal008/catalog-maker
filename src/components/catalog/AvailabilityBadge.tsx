import { stockLabel } from "@/lib/catalog/format";
export function AvailabilityBadge({ value }: { value: string }) { return <span className={`stock ${value === "IN_STOCK" ? "stock-ready" : "stock-unavailable"}`}><span aria-hidden="true">●</span> {stockLabel(value)}</span>; }

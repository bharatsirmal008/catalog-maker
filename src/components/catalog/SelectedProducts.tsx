"use client";
import { useEffect, useState } from "react";
import type { ProductCardData, ProductList, CatalogConfigData } from "@/types/catalog";
import type { SelectionKind } from "@/lib/catalog/selection-storage";
import { makeWhatsAppEnquiry } from "@/lib/catalog/whatsapp";
import { useSelection } from "./SelectionProvider";
import { ProductGrid } from "./ProductGrid";
import { EmptyState, ProductSkeleton } from "./States";

async function fetchProducts(ids: string[], signal?: AbortSignal) {
  const response = await fetch(`/api/products?${new URLSearchParams({ ids: ids.join(","), limit: "48" })}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("We couldn’t refresh your products. Please try again. Your saved selection has not been changed.");
  const result: ProductList = await response.json();
  return ids.flatMap((id) => { const product = result.data.find((item) => item.id === id); return product ? [product] : []; });
}
export function SelectedProducts({ kind }: { kind: SelectionKind }) {
  const { selection, ready, clear } = useSelection();
  const ids = selection[kind];
  return <>
    <section className="selection-heading"><p className="eyebrow">YOUR EVERYDAY EDIT</p><h1>{kind === "wishlist" ? "Saved for later." : "Let’s talk details."}</h1><p>{kind === "wishlist" ? "Your favourites, with today’s prices and availability." : "Select your pieces, review the message, then send it yourself in WhatsApp. This is an enquiry, not an order."}</p>
      {!!ids.length && <button className="button button-secondary" onClick={() => clear(kind)}>Clear {kind}</button>}
    </section>
    {!ready ? <ProductSkeleton /> : !ids.length ? <EmptyState title={kind === "wishlist" ? "Your wishlist is empty" : "Your enquiry is empty"} message="Explore the collection and add a few favourites." /> : <SelectionContents key={kind + ids.join(",")} ids={ids} kind={kind} />}
  </>;
}
function SelectionContents({ ids, kind }: { ids: string[]; kind: SelectionKind }) {
  const { toggle } = useSelection();
  const [products, setProducts] = useState<ProductCardData[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof makeWhatsAppEnquiry> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(ids, controller.signal).then(setProducts).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load products."); });
    return () => controller.abort();
  }, [ids, attempt]);
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(() => { setPreview(null); setError("The preview expired. Prepare it again to refresh prices and availability."); }, 60000);
    return () => clearTimeout(timer);
  }, [preview]);
  const missing = products ? ids.filter((id) => !products.some((product) => product.id === id)) : [];
  async function prepare() {
    setPreparing(true); setError(""); setPreview(null);
    try {
      const [fresh, response] = await Promise.all([fetchProducts(ids), fetch("/api/catalog/config", { cache: "no-store" })]);
      setProducts(fresh);
      if (fresh.length !== ids.length) throw new Error("Some selected products are no longer listed. Remove the unavailable entries before preparing your enquiry; no products will be silently omitted.");
      if (!response.ok) throw new Error("We couldn’t load the business contact details. Please try again.");
      const config: { data: CatalogConfigData } = await response.json();
      setPreview(makeWhatsAppEnquiry(config.data.whatsappNumber, fresh, window.location.origin));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare this enquiry."); }
    finally { setPreparing(false); }
  }
  return <>
    {error && <div role="alert" className="selection-warning"><p>{error}</p>{!products && <button className="button button-secondary" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Retry products</button>}</div>}
    {!products && !error && <ProductSkeleton />}
    {!!missing.length && <section className="missing-products"><h2>Some products are no longer listed</h2><p>Deleted or hidden products stay in your selection until you remove them.</p>{missing.map((id) => <div key={id}><span>Unavailable product ({id.slice(-8)})</span><button className="button button-secondary" onClick={() => toggle(kind, id)} aria-label={`Remove unavailable product ${id}`}>Remove</button></div>)}</section>}
    {products && <ProductGrid products={products} />}
    {kind === "enquiry" && <section className="enquiry-summary"><h2>Your enquiry · {ids.length} selected</h2><p>We’ll include every selected product, its current base price, availability and catalog link. Please confirm options and stock with the business.</p>
      <button className="button" disabled={!products || preparing || missing.length > 0} onClick={prepare}>{preparing ? "Refreshing products…" : "Prepare WhatsApp enquiry"}</button>
      {preview && <div className="message-preview"><h3>Review your message</h3><pre>{preview.message}</pre><a className="button whatsapp-button" href={preview.url} target="_blank" rel="noopener noreferrer">Open WhatsApp</a><p>Nothing has been sent. Review and send the message in WhatsApp. This preview expires after one minute.</p></div>}
    </section>}
  </>;
}

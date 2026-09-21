"use client";
import { useRef, useState } from "react";
import type { ProductDetailData } from "@/types/catalog";
import { CatalogImage } from "./CatalogImage";
export function ProductGallery({ images, name }: { images: ProductDetailData["images"]; name: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const image = images[index];
  const move = (step: number) => setIndex((value) => (value + step + images.length) % images.length);
  const keys = (event: React.KeyboardEvent) => {
    if (images.length < 2) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
  };
  const swipe = { onTouchStart: (event: React.TouchEvent) => { touchX.current = event.changedTouches[0].clientX; }, onTouchEnd: (event: React.TouchEvent) => { const delta = event.changedTouches[0].clientX - (touchX.current ?? event.changedTouches[0].clientX); if (Math.abs(delta) > 50 && images.length > 1) move(delta < 0 ? 1 : -1); touchX.current = null; } };
  return <div className="gallery" onKeyDown={keys}>
    <button ref={trigger} type="button" className="detail-image gallery-trigger" disabled={!images.length} aria-label={`Enlarge ${name} image ${index + 1}`} onClick={() => { setOpen(true); dialog.current?.showModal(); }} {...swipe}>
      <CatalogImage key={image?.id ?? "empty"} src={image?.imageUrl} alt={image?.altText || name} sizes="(max-width: 767px) 100vw, 55vw" priority />
      {!!images.length && <span className="gallery-hint">Enlarge ↗</span>}
    </button>
    {images.length > 1 && <><div className="gallery-controls"><button onClick={() => move(-1)} aria-label="Previous product image">←</button><span aria-live="polite">Image {index + 1} of {images.length}</span><button onClick={() => move(1)} aria-label="Next product image">→</button></div><div className="thumbnail-row">{images.map((img, i) => <button className="thumbnail" key={img.id} aria-label={`Show image ${i + 1} of ${name}`} aria-pressed={i === index} onClick={() => setIndex(i)}><CatalogImage src={img.imageUrl} alt={img.altText || `${name}, image ${i + 1}`} sizes="75px" /></button>)}</div></>}
    <dialog ref={dialog} className="lightbox" aria-label={`${name} image viewer`} onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <div className="lightbox-toolbar"><span>{index + 1} / {images.length}</span><button autoFocus type="button" onClick={() => dialog.current?.close()} aria-label="Close image viewer">Close ×</button></div>
      {open && <div className="lightbox-image" {...swipe}><CatalogImage key={image?.id} src={image?.imageUrl} alt={image?.altText || name} sizes="90vw" /></div>}
      {images.length > 1 && <div className="gallery-controls"><button onClick={() => move(-1)} aria-label="Previous enlarged image">← Previous</button><button onClick={() => move(1)} aria-label="Next enlarged image">Next →</button></div>}
    </dialog>
  </div>;
}

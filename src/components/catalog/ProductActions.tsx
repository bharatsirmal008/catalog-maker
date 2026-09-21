"use client";
import { useSelection } from "./SelectionProvider";
export function ProductActions({ id, name }: { id: string; name: string }) {
  const { selection, ready, toggle } = useSelection();
  const saved = selection.wishlist.includes(id), selected = selection.enquiry.includes(id);
  return <div className="product-actions">
    <button type="button" disabled={!ready} aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} wishlist`} onClick={() => toggle("wishlist", id)}>{saved ? "♥ Saved" : "♡ Save"}</button>
    <button type="button" disabled={!ready} aria-pressed={selected} aria-label={`${selected ? "Remove" : "Add"} ${name} ${selected ? "from" : "to"} enquiry`} onClick={() => toggle("enquiry", id)}>{selected ? "✓ Selected" : "+ Enquire"}</button>
  </div>;
}

"use client";
import Link from "next/link";
import { useSelection } from "./SelectionProvider";
export function SelectionLinks() {
  const { selection, ready } = useSelection();
  return <><Link href="/wishlist">Wishlist ({ready ? selection.wishlist.length : "–"})</Link><Link href="/enquiry">Enquiry ({ready ? selection.enquiry.length : "–"})</Link></>;
}

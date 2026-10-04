"use client";
import Link from "next/link";
import { FiHeart, FiMessageSquare } from "react-icons/fi";
import { useSelection } from "./SelectionProvider";
export function SelectionLinks() {
  const { selection, ready } = useSelection();
  return <><Link href="/wishlist" className="header-link"><FiHeart aria-hidden="true" />Wishlist ({ready ? selection.wishlist.length : "–"})</Link><Link href="/enquiry" className="header-link"><FiMessageSquare aria-hidden="true" />Enquiry ({ready ? selection.enquiry.length : "–"})</Link></>;
}

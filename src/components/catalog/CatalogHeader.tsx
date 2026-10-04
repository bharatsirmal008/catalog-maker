import Link from "next/link";
import { FiGrid, FiUser } from "react-icons/fi";
import { BrandLogo } from "@/components/BrandLogo";
import { SelectionLinks } from "./SelectionLinks";
export function CatalogHeader({ businessName, template = "GRID" }: { businessName: string; template?: "GRID" | "COLLECTION" }) {
  if (template === "COLLECTION") return <header className="showcase-header"><div className="shell"><div className="showcase-masthead"><span className="eyebrow">THE COLLECTION JOURNAL</span><Link href="/" className="showcase-brand" aria-label={`${businessName} home`}><BrandLogo /></Link><Link href="/admin" className="header-link"><FiUser aria-hidden="true" />Studio / Admin</Link></div><nav aria-label="Main navigation" className="showcase-nav"><Link href="/" className="header-link"><FiGrid aria-hidden="true" />All collections</Link><SelectionLinks /></nav></div></header>;
  return <header className="catalog-header"><div className="shell header-inner">
    <Link href="/" className="brand" aria-label={`${businessName} home`}><BrandLogo /></Link>
    <nav aria-label="Main navigation" className="main-nav"><Link href="/" className="header-link"><FiGrid aria-hidden="true" />The collection</Link><SelectionLinks /><Link href="/admin" className="header-link"><FiUser aria-hidden="true" />Admin</Link></nav>
  </div></header>;
}

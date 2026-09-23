import Link from "next/link";
import { SelectionLinks } from "./SelectionLinks";
export function CatalogHeader({ businessName, template = "GRID" }: { businessName: string; template?: "GRID" | "COLLECTION" }) {
  if (template === "COLLECTION") return <header className="showcase-header"><div className="shell"><div className="showcase-masthead"><span className="eyebrow">THE COLLECTION JOURNAL</span><Link href="/" className="showcase-brand">{businessName}</Link><Link href="/admin">Studio / Admin</Link></div><nav aria-label="Main navigation" className="showcase-nav"><Link href="/">All collections</Link><SelectionLinks /></nav></div></header>;
  return <header className="catalog-header"><div className="shell header-inner">
    <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">cm.</span><span>{businessName}</span></Link>
    <nav aria-label="Main navigation" className="main-nav"><Link href="/">The collection</Link><SelectionLinks /><Link href="/admin">Admin</Link></nav>
  </div></header>;
}

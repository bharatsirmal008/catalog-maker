import Link from "next/link";
import { SelectionLinks } from "./SelectionLinks";
export function CatalogHeader({ businessName }: { businessName: string }) {
  return <header className="catalog-header"><div className="shell header-inner">
    <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">cm.</span><span>{businessName}</span></Link>
    <nav aria-label="Main navigation" className="main-nav"><Link href="/">The collection</Link><SelectionLinks /><Link href="/admin">Admin</Link></nav>
  </div></header>;
}

import { getCatalogConfig } from "@/lib/catalog/catalog.service";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { SelectionProvider } from "@/components/catalog/SelectionProvider";
import { BrandLogo } from "@/components/BrandLogo";
export const dynamic = "force-dynamic";
export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const config = await getCatalogConfig().catch(() => ({ businessName: "Catalog Maker", whatsappNumber: null, activeTemplate: "GRID" as const }));
  return <div className={config.activeTemplate === "COLLECTION" ? "template-collection" : "template-grid"} data-template={config.activeTemplate}><SelectionProvider><a className="skip-link" href="#main-content">Skip to content</a><CatalogHeader businessName={config.businessName} template={config.activeTemplate} /><main id="main-content" className="shell catalog-main">{children}</main><footer className="shell catalog-footer"><div className="footer-brand"><BrandLogo /><span>Thoughtfully selected.</span></div><span>{config.whatsappNumber ? `WhatsApp: +${config.whatsappNumber}` : "Explore. Discover. Enquire."}</span></footer></SelectionProvider></div>;
}

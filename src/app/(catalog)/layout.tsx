import { getCatalogConfig } from "@/lib/catalog/catalog.service";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
export const dynamic = "force-dynamic";
export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const config = await getCatalogConfig().catch(() => ({ businessName: "Catalog Maker", whatsappNumber: null }));
  return <><a className="skip-link" href="#main-content">Skip to content</a><CatalogHeader businessName={config.businessName} /><main id="main-content" className="shell catalog-main">{children}</main><footer className="shell catalog-footer"><span>{config.businessName} <span aria-hidden="true">/</span> Thoughtfully selected.</span><span>{config.whatsappNumber ? `WhatsApp: +${config.whatsappNumber}` : "Explore. Discover. Enquire."}</span></footer></>;
}

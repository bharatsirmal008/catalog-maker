import Image from "next/image";
import logo from "../../public/catalog-maker-logo.png";

export function BrandLogo() {
  return <Image src={logo} alt="Catalog Maker logo" className="brand-logo" sizes="(max-width: 639px) 88px, 112px" preload />;
}

import Image from "next/image";

export function BrandLogo() {
  return <Image src="/cmm-logo.png" alt="CMM logo" width={640} height={156} className="brand-logo" unoptimized />;
}

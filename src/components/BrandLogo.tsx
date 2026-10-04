import Image from "next/image";

export function BrandLogo() {
  return <Image src="/cm-logo.svg" alt="CM logo" width={320} height={120} className="brand-logo" unoptimized />;
}

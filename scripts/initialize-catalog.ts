import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { catalogSettings } from "../src/lib/validations/catalog";
async function main() {
  if (await prisma.catalogConfig.findFirst()) { console.log("Catalog settings already exist; preserved."); return; }
  const data = catalogSettings.parse({ businessName: process.env.CATALOG_BUSINESS_NAME ?? "Catalog Maker", whatsappNumber: process.env.CATALOG_WHATSAPP_NUMBER ?? null, activeTemplate: "GRID" });
  await prisma.catalogConfig.create({ data }); console.log("Initial catalog settings created. No demo products or administrator were added.");
}
main().catch(() => { console.error("Could not initialize catalog. Check database and business settings."); process.exitCode = 1; }).finally(() => prisma.$disconnect());

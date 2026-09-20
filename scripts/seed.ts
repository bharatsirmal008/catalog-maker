import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
export async function seedDemo() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Set ALLOW_DEMO_SEED=true in development to seed local demo products");
  const categories = ["Everyday carry", "Clothing", "Home & living", "Desk essentials", "Accessories", "Seasonal"];
  const categoryIds = categories.map((_, i) => `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
  for (const [i, name] of categories.entries()) {
    const slug = "demo-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!await prisma.category.findFirst({ where: { OR: [{ id: categoryIds[i] }, { slug }] } })) {
      await prisma.category.create({ data: { id: categoryIds[i], name, slug, displayOrder: i, parentId: i === 4 ? categoryIds[0] : null } });
    }
  }
  const products: [string, string, number, string][] = [
    ["Canvas Day Tote", "890.00", 0, "tote"], ["Weekender Carryall", "2490.00", 0, "tote"],
    ["Everyday Cotton Shirt", "1290.00", 1, "shirt"], ["Relaxed Linen Shirt", "2190.00", 1, "shirt"],
    ["Stoneware Morning Mug", "490.00", 2, "mug"], ["Ceramic Pouring Jug", "1190.00", 2, "mug"],
    ["Arc Desk Lamp", "3290.00", 3, "lamp"], ["Pocket Notebook", "290.00", 3, "book"],
    ["Steel Water Bottle", "790.00", 0, "bottle"], ["Soft Knit Scarf", "990.00", 4, "shirt"],
    ["Cork Desk Mat", "1490.00", 3, "book"], ["Minimal Pen Set", "390.00", 3, "book"],
    ["Linen Cushion Cover", "690.00", 2, "tote"], ["Travel Pouch", "590.00", 4, "tote"],
    ["Weekend Cap", "790.00", 4, "shirt"], ["Gift Note Set", "190.00", 3, "book"],
  ];
  for (const [i, [name, price, category, asset]] of products.entries()) {
    const id = `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const slug = "demo-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (await prisma.product.findFirst({ where: { OR: [{ id }, { slug }] } })) continue;
    await prisma.product.create({ data: {
      id, slug, name, price, currency: "INR", sku: `LOCAL-DEMO-${String(i + 1).padStart(3, "0")}`,
      description: i === 15 ? null : `${name} — a considered essential for everyday use. Thoughtful proportions, practical details, and a timeless finish. This is a local demonstration product; the image is an illustration.`,
      categoryId: categoryIds[category], displayOrder: i, isFeatured: i < 4,
      availability: i === 5 || i === 14 ? "OUT_OF_STOCK" : "IN_STOCK",
      images: { create: i === 15 ? [] : [
        { imageUrl: `/demo/${asset}.svg`, altText: `${name} illustration`, displayOrder: 0 },
        ...(i < 4 ? [{ imageUrl: `/demo/${asset}-detail.svg`, altText: `${name} detail illustration`, displayOrder: 1 }] : []),
      ] },
      variants: { create: i === 2 ? [
        { title: "Small", sku: "LOCAL-DEMO-003-S", price: "1290.00", stockQuantity: 8, attributes: { size: "S" } },
        { title: "Medium", sku: "LOCAL-DEMO-003-M", price: "1390.00", stockQuantity: 0, attributes: { size: "M" } },
      ] : [] },
    } });
  }
  if (!await prisma.catalogConfig.findFirst()) await prisma.catalogConfig.create({ data: { businessName: "Catalog Maker", whatsappNumber: null, activeTemplate: "GRID" } });
  console.log("Local demo seed complete: up to 6 categories and 16 products; existing records preserved.");
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/seed.ts")) {
  seedDemo().catch(() => { console.error("Demo seed failed. Check database access and ALLOW_DEMO_SEED."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}

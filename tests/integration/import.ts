import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/db/prisma";
import { runImport } from "../../src/lib/sync/import";
import { persistSourceProduct } from "../../src/lib/sync/persist";
import { IntegrationError } from "../../src/lib/integrations/errors";
import type { SourceProduct } from "../../src/lib/integrations/product";
import { listProducts, productDetail } from "../../src/lib/catalog/product.service";
import { productQuery } from "../../src/lib/validations/catalog";
if (process.env.ALLOW_INTEGRATION_TESTS !== "true") throw new Error("Explicit integration-test opt-in required");
function fixture(i: number): SourceProduct { return { externalId: `fixture-${i}`, name: `Integration fixture ${i}`, description: "Fixture, not a live import", sku: "SHARED-SKU", price: "1234.56", currency: "INR", sourceVisible: true, availability: "IN_STOCK", sourceUrl: null, updatedAt: "2026-09-01T00:00:00Z", categories: [{ externalId: "category-1", name: "Fixture collection" }], images: [{ externalId: "image-1", url: "https://cdn.shopify.com/s/files/demo.png", alt: null }], variants: [{ externalId: `variant-${i}`, title: "One", sku: null, price: "1234.56", stockQuantity: null, availability: "IN_STOCK", attributes: { Size: "One" } }], metadata: {} }; }
const records = Array.from({ length: 50 }, (_, i) => fixture(i));
const pages = (products = records) => async function* () { for (let i = 0; i < products.length; i += 10) yield products.slice(i, i + 10); };
async function main() {
  const sources: string[] = [];
  const localBefore = await prisma.product.findMany({ where: { sourceConnectionId: null }, orderBy: { id: "asc" } });
  try {
    for (let i = 0; i < 2; i++) sources.push((await prisma.sourceConnection.create({ data: { provider: "SHOPIFY", storeUrl: `https://fixture-${randomUUID()}.myshopify.com`, credentialKey: "TEST_ONLY_NOT_LIVE", enabled: true, verifiedAt: new Date() } })).id);
    const first = await runImport(sources[0], pages()); assert.equal(first.importedCount, 50); assert.equal(first.status, "SUCCEEDED"); console.log("PASS 50 deterministic fixture imports (not live Shopify)");
    const second = await runImport(sources[0], pages()); assert.equal(second.skippedCount, 50); assert.equal(await prisma.product.count({ where: { sourceConnectionId: sources[0] } }), 50); console.log("PASS repeat import: 0 duplicate products, 50 skipped");
    const other = await runImport(sources[1], pages([fixture(0)])); assert.equal(other.importedCount, 1); console.log("PASS identical source IDs/names/SKUs isolated across stores");
    const row = await prisma.product.findFirstOrThrow({ where: { sourceConnectionId: sources[0], sourceProductId: "fixture-0" } });
    const variant = await prisma.productVariant.findFirstOrThrow({ where: { productId: row.id } });
    await prisma.product.update({ where: { id: row.id }, data: { isVisible: false, isFeatured: true, displayOrder: 42 } });
    const changed = { ...fixture(0), price: "99.99", updatedAt: "2026-09-02T00:00:00Z", variants: [{ ...fixture(0).variants[0], price: "99.99", stockQuantity: 0, availability: "OUT_OF_STOCK" as const }] };
    assert.equal(await persistSourceProduct(sources[0], changed), "updated");
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(updated.price.toFixed(2), "99.99"); assert.equal(updated.isVisible, false); assert.equal(updated.isFeatured, true); assert.equal(updated.displayOrder, 42);
    assert.equal((await prisma.productVariant.findFirstOrThrow({ where: { productId: row.id } })).id, variant.id); console.log("PASS precise updates, variant identity and local overrides preserved");
    const broken = fixture(999); broken.categories = [{ externalId: "rollback", name: "Must roll back" }]; broken.variants[0].stockQuantity = 2147483648;
    await assert.rejects(() => persistSourceProduct(sources[0], broken)); assert.equal(await prisma.product.count({ where: { sourceConnectionId: sources[0], sourceProductId: broken.externalId } }), 0); assert.equal(await prisma.category.count({ where: { sourceConnectionId: sources[0], sourceCategoryId: "rollback" } }), 0); console.log("PASS database failure rolls back product/category/image transaction");
    const partial = await runImport(sources[0], async function* () { yield [fixture(60), new IntegrationError("INVALID_RESPONSE")]; }); assert.equal(partial.status, "FAILED"); assert.equal(partial.importedCount, 1); assert.equal(partial.failedCount, 1); console.log("PASS partial failure reported honestly; successful product preserved");
    let release!: () => void; let started!: () => void; const start = new Promise<void>((resolve) => { started = resolve; }); const hold = new Promise<void>((resolve) => { release = resolve; });
    const active = runImport(sources[0], async function* () { started(); await hold; yield []; }); await start;
    try { await assert.rejects(() => runImport(sources[0], pages([])), /already importing/); } finally { release(); await active; } console.log("PASS database-backed concurrent import protection");
    const visible = await listProducts(productQuery.parse({ q: "Integration fixture" })); assert(visible.pagination.total >= 50); const detail = await productDetail(visible.data[0].id); assert(detail.variants.length); assert.equal(detail.variants[0].stockQuantity, null); console.log("PASS imported products served through existing catalog services; unknown stock preserved");
    assert.deepEqual(await prisma.product.findMany({ where: { sourceConnectionId: null }, orderBy: { id: "asc" } }), localBefore); console.log("PASS manual/local products unchanged");
  } finally {
    await prisma.product.deleteMany({ where: { sourceConnectionId: { in: sources } } }); await prisma.category.deleteMany({ where: { sourceConnectionId: { in: sources } } }); await prisma.syncRun.deleteMany({ where: { sourceConnectionId: { in: sources } } }); await prisma.sourceConnection.deleteMany({ where: { id: { in: sources } } }); await prisma.$disconnect();
  }
}
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

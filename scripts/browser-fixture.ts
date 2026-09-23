import "dotenv/config";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { persistSourceProduct } from "../src/lib/sync/persist";
import { mapWooProduct } from "../src/lib/integrations/woocommerce/mapper";
import { wooFixture, wooCategories } from "../tests/fixtures/woo";
if (process.env.ALLOW_INTEGRATION_TESTS !== "true") throw new Error("Local fixture opt-in required");
const file = ".artifacts/day10-browser-fixture.json";
type State = { adminId: string; sourceIds: string[]; originalTemplate: "GRID" | "COLLECTION"; configId: string };
async function main() {
  const mode = process.argv[2];
  if (mode === "setup") {
    try { await readFile(file); throw new Error("Existing browser fixture must be cleaned first"); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const config = await prisma.catalogConfig.findFirstOrThrow(); const password = randomBytes(24).toString("base64url"); const email = `browser-${randomUUID()}@example.invalid`;
    const admin = await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword(password) } });
    const state: State = { adminId: admin.id, sourceIds: [], originalTemplate: config.activeTemplate, configId: config.id };
    await mkdir(".artifacts", { recursive: true }); await writeFile(file, JSON.stringify(state));
    for (const provider of ["SHOPIFY", "WOOCOMMERCE"] as const) {
      const source = await prisma.sourceConnection.create({ data: { provider, storeUrl: `https://browser-fixture-${randomUUID()}.example`, credentialKey: "BROWSER_FIXTURE_NOT_LIVE", enabled: false } }); state.sourceIds.push(source.id); await writeFile(file, JSON.stringify(state));
      const product = mapWooProduct(wooFixture(), [], wooCategories, "INR"); product.name = `Browser ${provider} fixture`; product.images = [{ externalId: "fixture", url: "/demo/tote.svg", alt: "Local test illustration" }];
      // Real normalized mapping validation requires absolute image URLs. Use an
      // intentionally unconfigured HTTPS image to exercise the visible fallback.
      product.images[0].url = "https://fixture.example/image.png";
      await persistSourceProduct(source.id, product);
    }
    console.log(JSON.stringify({ email, password, purpose: "temporary local browser-test login; deleted at cleanup" }));
  } else {
    const state: State = JSON.parse(await readFile(file, "utf8"));
    if (mode === "GRID" || mode === "COLLECTION") await prisma.catalogConfig.update({ where: { id: state.configId }, data: { activeTemplate: mode } });
    else if (mode === "cleanup") {
      await prisma.catalogConfig.update({ where: { id: state.configId }, data: { activeTemplate: state.originalTemplate } });
      await prisma.product.deleteMany({ where: { sourceConnectionId: { in: state.sourceIds } } }); await prisma.category.deleteMany({ where: { sourceConnectionId: { in: state.sourceIds } } }); await prisma.syncRun.deleteMany({ where: { sourceConnectionId: { in: state.sourceIds } } }); await prisma.sourceConnection.deleteMany({ where: { id: { in: state.sourceIds } } }); await prisma.adminSession.deleteMany({ where: { adminId: state.adminId } }); await prisma.adminUser.delete({ where: { id: state.adminId } }); await unlink(file);
    } else throw new Error("Use setup, GRID, COLLECTION or cleanup");
    console.log(`Browser fixture ${mode} complete`);
  }
  await prisma.$disconnect();
}
main().catch((error) => { console.error(error); process.exit(1); });

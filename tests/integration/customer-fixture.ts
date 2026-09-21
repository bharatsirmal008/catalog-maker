/** Local-only browser workflow fixture. Keep running; type help for actions, quit to restore. */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { prisma } from "../../src/lib/db/prisma";
import { hashPassword } from "../../src/lib/auth/password";
const base = "http://localhost:3000";
if (process.env.ALLOW_INTEGRATION_TESTS !== "true") throw new Error("Requires ALLOW_INTEGRATION_TESTS=true and a local test database");
async function main() {
const ids: string[] = [];
let adminId = "", cookie = "", categoryId = "";
const previous = await prisma.catalogConfig.findFirst({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
let temporaryConfigId: string | undefined;
async function request(path: string, method = "GET", body?: unknown, authenticated = true) {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Origin: base, ...(authenticated ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, body: await response.json() };
}
const settings = { businessName: previous?.businessName ?? "Catalog Maker", activeTemplate: "GRID", whatsappNumber: "12025550123" };
try {
  const email = `browser-test-${randomUUID()}@example.invalid`, password = randomBytes(32).toString("base64url");
  adminId = (await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword(password) } })).id;
  const login = await request("/api/admin/login", "POST", { email, password }, false);
  assert.equal(login.response.status, 200); cookie = login.response.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await request("/api/admin/config", "PATCH", settings, false)).response.status, 401);
  assert.equal((await request("/api/admin/config", "PATCH", { ...settings, whatsappNumber: "+bad" })).response.status, 400);
  assert.equal((await request("/api/admin/config", "PATCH", settings)).response.status, 200);
  if (!previous) temporaryConfigId = (await prisma.catalogConfig.findFirst())?.id;
  assert.equal((await request("/api/catalog/config")).body.data.whatsappNumber, settings.whatsappNumber);
  const category = await request("/api/admin/categories", "POST", { name: "Workflow hidden category", slug: "workflow-hidden-" + randomUUID(), isVisible: false });
  assert.equal(category.response.status, 201); categoryId = category.body.data.id;
  console.log("HIDDEN_CATEGORY " + category.body.data.slug);
  for (const [i, name] of ["Workflow Canvas Test", "Workflow Second Piece"].entries()) {
    const created = await request("/api/admin/products", "POST", { name, price: "125.50", images: i ? [{ imageUrl: "/demo/mug.svg" }] : [{ imageUrl: "/demo/tote.svg" }, { imageUrl: "/demo/tote-detail.svg" }] });
    assert.equal(created.response.status, 201); const id = created.body.data.id; ids.push(id);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id } })).price.toFixed(2), "125.50");
    assert.equal((await request(`/api/products/${id}`)).body.data.name, name);
    assert.equal((await request(`/api/admin/products/${id}`, "PATCH", { price: "1.00" }, false)).response.status, 401);
    console.log(`PRODUCT ${i + 1}: ${name} ${base}/products/${id}`);
  }
  console.log("PASS protected create → PostgreSQL → public API; unauthorized writes/config and invalid number rejected.");
  console.log("READY. Commands: update, broken, hide, delete, config-off, config-on, quit. Reserved fictional phone: 12025550123. Never click/send externally.");
  const lines = createInterface({ input: process.stdin, output: process.stdout });
  for await (const line of lines) {
    const command = line.trim();
    if (command === "quit") { lines.close(); break; }
    if (command === "update") {
      assert.equal((await request(`/api/admin/products/${ids[0]}`, "PATCH", { price: "987.65", availability: "OUT_OF_STOCK" })).response.status, 200);
      assert.equal((await request(`/api/products/${ids[0]}`)).body.data.price, "987.65");
      console.log("PASS protected price update and public API refresh: 987.65, OUT_OF_STOCK");
    } else if (command === "broken") {
      assert.equal((await request(`/api/admin/products/${ids[0]}`, "PATCH", { images: [{ imageUrl: "/demo/missing-image.svg" }] })).response.status, 200); console.log("BROKEN_IMAGE_READY");
    } else if (command === "hide") {
      assert.equal((await request(`/api/admin/products/${ids[0]}`, "PATCH", { isVisible: false })).response.status, 200); console.log("HIDDEN_PRODUCT_READY");
    } else if (command === "delete") {
      assert.equal((await request(`/api/admin/products/${ids[1]}`, "DELETE")).response.status, 200); console.log("DELETED_SECOND_PRODUCT");
    } else if (command === "config-off" || command === "config-on") {
      assert.equal((await request("/api/admin/config", "PATCH", { ...settings, whatsappNumber: command === "config-on" ? settings.whatsappNumber : null })).response.status, 200); console.log(command);
    } else console.log("Commands: update, broken, hide, delete, config-off, config-on, quit");
  }
} finally {
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  if (previous) await prisma.catalogConfig.update({ where: { id: previous.id }, data: { businessName: previous.businessName, whatsappNumber: previous.whatsappNumber, activeTemplate: previous.activeTemplate } });
  else if (temporaryConfigId) await prisma.catalogConfig.deleteMany({ where: { id: temporaryConfigId } });
  if (adminId) await prisma.adminUser.deleteMany({ where: { id: adminId } });
  await prisma.$disconnect(); console.log("CLEANED: temporary products/category/admin removed; original contact settings restored.");
}
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

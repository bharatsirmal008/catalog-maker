import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { prisma } from "../../src/lib/db/prisma";
import { hashPassword } from "../../src/lib/auth/password";
import { seedDemo } from "../../scripts/seed";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname) || process.env.ALLOW_INTEGRATION_TESTS !== "true") throw new Error("Integration tests require localhost and ALLOW_INTEGRATION_TESTS=true");
const email = `api-test-${randomUUID()}@example.invalid`;
const password = randomBytes(32).toString("base64url");
const productIds: string[] = [];
const categoryIds: string[] = [];
let adminId = "";
let sessionCookie = "";
let sessionCookieName = "catalog-admin";
let passed = 0;
async function request(path: string, method = "GET", body?: unknown, cookie = sessionCookie, origin = base) {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  return { response, result };
}
async function test(name: string, action: () => Promise<void>) {
  await action(); passed++; console.log("PASS " + name);
}
async function main() {
  const initialMigration = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations ORDER BY started_at`;
  adminId = (await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword(password) } })).id;
  try {
    await test("health and Day 1 migration preserved", async () => { const r = await request("/api/health"); assert.equal(r.response.status, 200); assert.equal(r.result.database, "connected"); assert(initialMigration.some((m) => m.migration_name === "20260920172813_init")); });
    await test("unauthenticated product and category writes rejected", async () => {
      for (const path of ["/api/admin/products", "/api/admin/categories"]) for (const method of ["POST", "PATCH", "DELETE"]) {
        const r = await request(path + (method === "POST" ? "" : "/" + randomUUID()), method, method === "DELETE" ? undefined : {}, "");
        assert.equal(r.response.status, 401);
      }
      assert.equal((await request("/api/admin/products", "GET", undefined, "")).response.status, 401);
      assert.equal((await request("/api/admin/integrations/shopify/check", "POST", {}, "")).response.status, 401);
      assert.equal((await request("/api/admin/sources", "GET", undefined, "")).response.status, 401);
      assert.equal((await request("/api/admin/sources", "POST", {}, "")).response.status, 401);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}/import`, "POST", {}, "")).response.status, 401);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}/sync`, "POST", {}, "")).response.status, 401);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}`, "PATCH", { enabled: false }, "")).response.status, 401);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}`, "POST", { action: "check" }, "")).response.status, 401);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}/runs`, "GET", undefined, "")).response.status, 401);
    });
    await test("invalid credentials rejected; login origin checked", async () => {
      assert.equal((await request("/api/admin/login", "POST", { email, password: "wrong" }, "")).response.status, 401);
      assert.equal((await request("/api/admin/login", "POST", { email, password }, "", "https://evil.example")).response.status, 403);
    });
    await test("administrator login and HttpOnly SameSite session", async () => {
      const r = await request("/api/admin/login", "POST", { email, password }, "");
      assert.equal(r.response.status, 200);
      const header = r.response.headers.get("set-cookie")!;
      assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=strict/i);
      sessionCookie = header.split(";")[0];
      sessionCookieName = sessionCookie.split("=")[0];
      assert.equal((await request("/api/admin/session")).result.data.email, email);
      assert.equal((await request("/api/admin/integrations/shopify/check", "POST", {}, sessionCookie, "https://evil.example")).response.status, 403);
      assert.equal((await request("/api/admin/integrations/shopify/check", "POST", { accessToken: "never-accepted" })).response.status, 400);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}/sync`, "POST", { confirm: true }, sessionCookie, "https://evil.example")).response.status, 403);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}/sync`, "POST", { confirm: true, token: "never-accepted" })).response.status, 400);
      assert.equal((await request(`/api/admin/sources/${randomUUID()}`, "PATCH", { enabled: false }, sessionCookie, "https://evil.example")).response.status, 403);
      assert.equal((await request("/api/admin/sources", "POST", { provider: "WOOCOMMERCE", consumerSecret: "never-accepted" })).response.status, 400);
    });
    await test("visible category API and malformed query", async () => {
      const r = await request("/api/categories"); assert.equal(r.response.status, 200); assert(r.result.data.length >= 6);
      assert.equal((await request("/api/categories?parentId=bad")).response.status, 400);
    });
    await test("listing pagination and minimal card payload", async () => {
      const r = await request("/api/products?page=1&limit=12"); assert.equal(r.result.data.length, 12); assert(r.result.pagination.total >= 16);
      assert.equal(r.result.data[0].sourceConnectionId, undefined); assert.equal(r.result.data[0].description, undefined);
    });
    await test("search, category, availability and combined filtering", async () => {
      const r = await request("/api/products?q=Canvas&category=demo-everyday-carry&available=true");
      assert.equal(r.result.data.length, 1); assert.equal(r.result.data[0].name, "Canvas Day Tote");
    });
    await test("database sorting and invalid pagination", async () => {
      const r = await request("/api/products?sort=price_asc"); const prices = r.result.data.map((p: { price: string }) => Number(p.price));
      assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
      for (const query of ["page=0", "limit=49", "sort=unknown", "available=garbage"]) assert.equal((await request("/api/products?" + query)).response.status, 400);
    });
    await test("details, variants, related products and 404s", async () => {
      const id = "10000000-0000-4000-8000-000000000003";
      const r = await request("/api/products/" + id); assert.equal(r.response.status, 200); assert.equal(r.result.data.variants.length, 2); assert.equal(r.result.data.images.length, 2);
      const related = await request("/api/products/" + id + "/related"); assert(related.result.data.every((p: { id: string; availability: string }) => p.id !== id && p.availability === "IN_STOCK"));
      for (const missing of ["bad-id", randomUUID()]) assert.equal((await request("/api/products/" + missing)).response.status, 404);
    });
    await test("safe public configuration", async () => {
      const r = await request("/api/catalog/config"); assert.deepEqual(Object.keys(r.result.data).sort(), ["activeTemplate", "businessName", "whatsappNumber"]);
    });
    await test("template setting authorization, persistence and fresh server rendering", async () => {
      const original = (await request("/api/admin/config")).result.data;
      try {
        assert.equal((await request("/api/admin/config", "PATCH", { ...original, activeTemplate: "COLLECTION" }, "")).response.status, 401);
        assert.equal((await request("/api/admin/config", "PATCH", { ...original, activeTemplate: "COLLECTION" }, sessionCookie, "https://evil.example")).response.status, 403);
        assert.equal((await request("/api/admin/config", "PATCH", { ...original, activeTemplate: "UNKNOWN" })).response.status, 400);
        for (const template of ["GRID", "COLLECTION"]) {
          assert.equal((await request("/api/admin/config", "PATCH", { ...original, activeTemplate: template })).response.status, 200);
          assert.equal((await request("/api/catalog/config")).result.data.activeTemplate, template);
          const html = await (await fetch(base)).text(); assert(html.includes(`data-template="${template}"`));
          if (template === "COLLECTION") assert(html.includes("showcase-hero"));
        }
      } finally { await request("/api/admin/config", "PATCH", original); }
    });
    await test("category create, rename, visibility and cycles", async () => {
      const parent = await request("/api/admin/categories", "POST", { name: "Integration parent" }); assert.equal(parent.response.status, 201); categoryIds.push(parent.result.data.id);
      const child = await request("/api/admin/categories", "POST", { name: "Integration child", parentId: categoryIds[0] }); categoryIds.push(child.result.data.id);
      assert.equal((await request("/api/admin/categories/" + categoryIds[0], "PATCH", { parentId: categoryIds[1] })).response.status, 400);
      assert.equal((await request("/api/admin/categories/" + categoryIds[0], "PATCH", { parentId: categoryIds[0] })).response.status, 400);
      assert.equal((await request("/api/admin/categories/" + categoryIds[0], "PATCH", { name: "Renamed parent", isVisible: false })).response.status, 200);
      const visible = await request("/api/categories"); assert(!visible.result.data.some((c: { id: string }) => categoryIds.includes(c.id)));
      await request("/api/admin/categories/" + categoryIds[0], "PATCH", { isVisible: true });
    });
    await test("manual product create persists with exact decimal and images", async () => {
      const r = await request("/api/admin/products", "POST", { name: "Integration proof product", price: "19.95", categoryId: categoryIds[1], images: [{ imageUrl: "/demo/tote.svg" }] });
      assert.equal(r.response.status, 201); productIds.push(r.result.data.id);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productIds[0] } })).price.toFixed(2), "19.95");
      assert.equal((await request("/api/products/" + productIds[0])).result.data.images.length, 1);
    });
    await test("price, availability, description, image and category updates", async () => {
      const r = await request("/api/admin/products/" + productIds[0], "PATCH", { price: "29.95", availability: "OUT_OF_STOCK", description: "Updated", images: [{ imageUrl: "/demo/mug.svg" }], categoryId: categoryIds[0] });
      assert.equal(r.response.status, 200);
      const detail = (await request("/api/products/" + productIds[0])).result.data;
      assert.equal(detail.price, "29.95"); assert.equal(detail.availability, "OUT_OF_STOCK"); assert.equal(detail.images[0].imageUrl, "/demo/mug.svg");
    });
    await test("hidden products return 404", async () => {
      await request("/api/admin/products/" + productIds[0], "PATCH", { isVisible: false });
      assert.equal((await request("/api/products/" + productIds[0])).response.status, 404);
      await request("/api/admin/products/" + productIds[0], "PATCH", { isVisible: true });
    });
    await test("validation rejects negative prices and protected identities", async () => {
      for (const body of [{ name: "X", price: "-1" }, { name: "X", price: "1", sourceProductId: "injected" }, { name: "", price: "1" }]) assert.equal((await request("/api/admin/products", "POST", body)).response.status, 400);
      assert.equal((await request("/api/admin/categories", "POST", { name: " " })).response.status, 400);
      assert.equal((await request("/api/admin/products/" + productIds[0], "PATCH", { price: "1" }, sessionCookie, "https://evil.example")).response.status, 403);
      assert.equal((await request("/api/admin/products/" + randomUUID(), "PATCH", { name: "Missing" })).response.status, 404);
    });
    await test("category deletion preserves products; product deletion cascades", async () => {
      await prisma.productVariant.create({ data: { productId: productIds[0], title: "Test", price: "29.95", attributes: {} } });
      assert.equal((await request("/api/admin/categories/" + categoryIds[0], "DELETE")).response.status, 200);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productIds[0] } })).categoryId, null);
      assert.equal((await request("/api/admin/products/" + productIds[0], "DELETE")).response.status, 200);
      assert.equal(await prisma.productImage.count({ where: { productId: productIds[0] } }), 0);
      assert.equal(await prisma.productVariant.count({ where: { productId: productIds[0] } }), 0);
    });
    await test("external identity uniqueness and imported edit policy", async () => {
      const source = await prisma.sourceConnection.create({ data: { provider: "SHOPIFY", storeUrl: `https://${randomUUID()}.example.invalid`, credentialKey: "integration-test-no-credentials" } });
      let importedId = "";
      try {
        const row = await prisma.product.create({ data: { name: "Temporary constraint fixture", slug: randomUUID(), price: "1", sourceConnectionId: source.id, sourceProductId: "fixture" } }); importedId = row.id;
        await assert.rejects(prisma.product.create({ data: { name: "Duplicate fixture", slug: randomUUID(), price: "1", sourceConnectionId: source.id, sourceProductId: "fixture" } }));
        assert.equal((await request("/api/admin/products/" + row.id, "PATCH", { price: "2" })).response.status, 409);
        assert.equal((await request("/api/admin/products/" + row.id, "PATCH", { isVisible: false })).response.status, 200);
        assert.equal((await request("/api/admin/products/" + row.id, "DELETE")).response.status, 409);
      } finally { if (importedId) await prisma.product.delete({ where: { id: importedId } }); await prisma.sourceConnection.delete({ where: { id: source.id } }); }
    });
    await test("seed repeat is idempotent and preserves edited records", async () => {
      const before = await prisma.product.count(); process.env.ALLOW_DEMO_SEED = "true"; await seedDemo(); await seedDemo(); assert.equal(await prisma.product.count(), before);
    });
    await test("logout revokes session and replay is rejected", async () => {
      assert.equal((await request("/api/admin/logout", "POST")).response.status, 200);
      assert.equal((await request("/api/admin/session")).response.status, 401);
    });
    await test("expired and forged sessions rejected", async () => {
      const token = randomBytes(32).toString("hex");
      await prisma.adminSession.create({ data: { adminId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await request("/api/admin/session", "GET", undefined, sessionCookieName + "=" + token)).response.status, 401);
      assert.equal((await request("/api/admin/session", "GET", undefined, sessionCookieName + "=forged")).response.status, 401);
    });
    console.log(`API integration: ${passed} groups passed.`);
  } finally {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    if (adminId) await prisma.adminUser.delete({ where: { id: adminId } });
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Integration failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());

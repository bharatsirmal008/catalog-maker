import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { prisma } from "../../src/lib/db/prisma";
import { hashPassword } from "../../src/lib/auth/password";
import { makeWhatsAppEnquiry } from "../../src/lib/catalog/whatsapp";
import { writeFile, mkdir } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const isLocal = ["localhost", "127.0.0.1"].includes(new URL(base).hostname);
const hostedOptIn = process.env.ALLOW_HOSTED_DEMO_TESTS === "true" && base === process.env.APP_URL && new URL(base).protocol === "https:";
if (process.env.ALLOW_INTEGRATION_TESTS !== "true" || (!isLocal && !hostedOptIn)) throw new Error("Test opt-in and matching demo origin required");
const liveUpload = process.env.VERIFY_CLOUDINARY_UPLOAD === "true";
const liveImports = process.env.VERIFY_LIVE_IMPORTS === "true";
let cookie = "", adminId = "", productId = "", uploadedPublicId = "";
let original: { businessName: string; whatsappNumber: string | null; activeTemplate: "GRID" | "COLLECTION" } | undefined;
const checks: { name: string; result: string }[] = [];
async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(base + path, { method, headers: { Origin: base, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(600000) });
  const result = await response.json(); return { response, result };
}
function pass(name: string, result = "PASS") { checks.push({ name, result }); console.log(`${result}: ${name}`); }
async function main() {
  const email = `deployment-test-${randomUUID()}@example.invalid`, password = randomBytes(32).toString("base64url");
  adminId = (await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword(password) } })).id;
  try {
    const login = await request("/api/admin/login", "POST", { email, password }); assert.equal(login.response.status, 200);
    cookie = login.response.headers.get("set-cookie")!.split(";")[0];
    assert.match(login.response.headers.get("set-cookie")!, /HttpOnly/i); pass("Admin login and protected session");
    if (!isLocal) {
      assert.match(login.response.headers.get("set-cookie")!, /; Secure(?:;|$)/i);
      assert.match(login.response.headers.get("set-cookie")!, /SameSite=Strict/i);
      pass("Hosted session cookie is Secure, HttpOnly and SameSite=Strict");
    }
    const config = await request("/api/catalog/config"); original = config.result.data;
    const wrongOrigin = await fetch(base + "/api/admin/config", { method: "PATCH", headers: { Origin: "https://untrusted.example", Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(original), signal: AbortSignal.timeout(30000) });
    assert.equal(wrongOrigin.status, 403); pass("Authenticated mutations reject an untrusted Origin");
    const unauthorized = await fetch(base + "/api/admin/images", { method: "POST" }); assert.equal(unauthorized.status, 401);
    pass("Image upload rejects unauthenticated requests");
    let imageUrl: string | undefined;
    if (liveUpload) {
      const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=", "base64");
      const form = new FormData(); form.set("file", new File([image], "deployment-test.png", { type: "image/png" }));
      const response = await fetch(base + "/api/admin/images", { method: "POST", headers: { Origin: base, Cookie: cookie }, body: form });
      const result = await response.json(); assert.equal(response.status, 201, result.error?.message);
      imageUrl = result.data.imageUrl;
      const publicId = new URL(imageUrl!).pathname.match(/\/image\/upload\/v\d+\/(catalog-maker\/[a-f0-9-]{36})\.(?:png|jpg|webp)$/)?.[1];
      assert(publicId, "Unexpected test upload identity"); uploadedPublicId = publicId;
      pass("Live Cloudinary upload through authenticated product endpoint");
    }
    const create = await request("/api/admin/products", "POST", { name: "Temporary deployment verification", description: "Description saved through the administrator API.", price: "1.00", currency: "INR", availability: "IN_STOCK", images: imageUrl ? [{ imageUrl, altText: "Temporary upload verification" }] : [] });
    assert.equal(create.response.status, 201); productId = create.result.data.id;
    const detail = await request(`/api/products/${productId}`); assert.equal(detail.result.data.description, "Description saved through the administrator API.");
    if (imageUrl) {
      assert.equal(detail.result.data.images[0].imageUrl, imageUrl);
      const optimized = await fetch(base + "/_next/image?" + new URLSearchParams({ url: imageUrl, w: "640", q: "75" }));
      assert.equal(optimized.status, 200); assert.match(optimized.headers.get("content-type")!, /^image\//);
      pass("Cloudinary URL persists and Next image delivery succeeds");
    }
    pass("Manual product description persists and is publicly readable");
    for (const activeTemplate of ["GRID", "COLLECTION"] as const) {
      const save = await request("/api/admin/config", "PATCH", { ...original, activeTemplate }); assert.equal(save.response.status, 200);
      for (const path of ["/", `/products/${productId}`, "/wishlist", "/enquiry"]) {
        const page = await fetch(base + path); assert.equal(page.status, 200); assert.match(await page.text(), new RegExp(`data-template="${activeTemplate}"`));
      }
      pass(`${activeTemplate} persisted setting and customer routes render`);
    }
    if (original!.whatsappNumber) {
      const products = await request("/api/products?limit=12");
      const preview = makeWhatsAppEnquiry(original!.whatsappNumber, products.result.data.slice(0, 1), base);
      assert(preview.url.startsWith(`https://wa.me/${original!.whatsappNumber}?`));
      assert(preview.message.includes(products.result.data[0].name)); pass("WhatsApp message generation with current catalog data (no message sent)");
    } else pass("WhatsApp business number", "NOT_CONFIGURED");
    if (liveImports) {
      for (const provider of ["SHOPIFY", "WOOCOMMERCE"] as const) {
        const registered = await request("/api/admin/sources", "POST", { provider }); assert.equal(registered.response.status, 201, `${provider} connection check failed (HTTP ${registered.response.status})`);
        const id = registered.result.data.id;
        if (!registered.result.data.enabled) { pass(`${provider} import`, "DISABLED"); continue; }
        const imported = await request(`/api/admin/sources/${id}/import`, "POST", { confirm: true }); assert.equal(imported.response.status, 200);
        assert.equal(imported.result.data.status, "SUCCEEDED", imported.result.data.errorSummary ?? "Import unsuccessful");
        const total = await prisma.product.count({ where: { sourceConnectionId: id } });
        pass(`${provider} live import: ${total} saved products, ${imported.result.data.failedCount} failed`);
      }
    }
  } catch (error) {
    pass(error instanceof Error ? error.message : "Deployment verification failed", "FAILED");
    throw error;
  } finally {
    if (original && cookie) { const restored = await request("/api/admin/config", "PATCH", original); assert.equal(restored.response.status, 200); }
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (adminId) {
      const email = (await prisma.adminUser.findUnique({ where: { id: adminId } }))?.email;
      if (email) { const key = createHash("sha256").update(`${email}:${Math.floor(Date.now()/900000)}`).digest("hex"); await prisma.loginThrottle.deleteMany({ where: { key } }); }
      await prisma.adminSession.deleteMany({ where: { adminId } }); await prisma.adminUser.deleteMany({ where: { id: adminId } });
    }
    if (uploadedPublicId) {
      const timestamp = String(Math.floor(Date.now()/1000));
      const signature = createHash("sha256").update(`public_id=${uploadedPublicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`).digest("hex");
      const body = new URLSearchParams({ public_id: uploadedPublicId, timestamp, signature, api_key: process.env.CLOUDINARY_API_KEY! });
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(30000) });
      const result = await response.json(); assert(response.ok && ["ok", "not found"].includes(result.result), "Test cloud asset cleanup failed");
      pass("Temporary product, test login and cloud image cleaned up");
    }
    await mkdir(".artifacts", { recursive: true });
    await writeFile(isLocal ? ".artifacts/deployment-smoke.json" : ".artifacts/hosted-deployment-smoke.json", JSON.stringify({ date: new Date().toISOString(), base, checks, browserTesting: "NOT_RUN: browser connection unavailable" }, null, 2));
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Deployment smoke test failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());

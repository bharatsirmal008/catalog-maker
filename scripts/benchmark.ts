import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "../src/lib/db/prisma";
const base = process.env.TEST_BASE_URL ?? "http://localhost:3002";
if (new URL(base).hostname !== "localhost") throw new Error("Local benchmarks only");
async function main() {
  const paths = ["/", "/?page=2", "/products/10000000-0000-4000-8000-000000000003", "/categories/demo-clothing", "/?q=Canvas", "/wishlist", "/enquiry", "/api/products?limit=12"];
  const results = [];
  for (const path of paths) {
    await fetch(base + path).then((r) => r.text());
    const samples = []; let html = "";
    for (let i = 0; i < 5; i++) { const start = performance.now(); const response = await fetch(base + path); html = await response.text(); if (!response.ok) throw new Error(`HTTP ${response.status}`); samples.push(performance.now() - start); }
    const scripts = [...new Set([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]))];
    let scriptBytes = 0; for (const script of scripts) { if (!script.startsWith("/_next/")) throw new Error("Unexpected script host"); scriptBytes += (await (await fetch(base + script)).arrayBuffer()).byteLength; }
    results.push({ path, medianMs: Math.round(samples.sort((a, b) => a - b)[2] * 10) / 10, decodedBodyBytes: Buffer.byteLength(html), initialScriptBytes: scriptBytes, scripts: scripts.length });
  }
  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), node: process.version, samples: 5, cache: "one warm-up per path; no throttling; decoded sizes exclude images/CSS", results }, null, 2));
  const plan = await prisma.$queryRaw`EXPLAIN (ANALYZE, FORMAT JSON) SELECT id, name, price FROM "Product" WHERE "isVisible" = true AND "sourceVisible" = true ORDER BY "isFeatured" DESC, "displayOrder" ASC, id ASC LIMIT 12`;
  console.log("Representative bounded listing plan", JSON.stringify(plan));
  await prisma.$disconnect();
}
main().catch((error) => { console.error(error); process.exit(1); });

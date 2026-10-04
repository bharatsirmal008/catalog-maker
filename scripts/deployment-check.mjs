import "dotenv/config";
export function deploymentProblems(env) {
  const errors = [];
  try {
    const origin = new URL(env.APP_URL ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || /^(localhost|127\.|\[::1\])/.test(origin.hostname)) throw new Error();
  } catch { errors.push("APP_URL must be the public HTTPS origin of the deployed app."); }
  try {
    const db = new URL(env.DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(db.protocol) || !db.hostname || ["localhost", "127.0.0.1", "::1", "[::1]"].includes(db.hostname)) throw new Error();
    // Import locking holds a dedicated database session; transaction pooling breaks it.
    if (db.hostname.includes("-pooler.")) errors.push("Use Neon's direct connection URL for this app's session advisory locks.");
    if (db.searchParams.get("sslmode") !== "verify-full") errors.push("DATABASE_URL must use sslmode=verify-full for hosted TLS certificate verification.");
  } catch { errors.push("DATABASE_URL must point to the hosted PostgreSQL database."); }
  const cloudNames = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  if (cloudNames.some((name) => !env[name]?.trim())) errors.push("Configure all three Cloudinary variables before building.");
  if (env.CLOUDINARY_CLOUD_NAME && !/^[a-zA-Z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME)) errors.push("CLOUDINARY_CLOUD_NAME contains invalid characters.");
  for (const [provider, names] of [["Shopify", ["SHOPIFY_STORE_URL", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"]], ["WooCommerce", ["WOOCOMMERCE_STORE_URL", "WOOCOMMERCE_CONSUMER_KEY", "WOOCOMMERCE_CONSUMER_SECRET"]]]) {
    const present = names.filter((name) => env[name]?.trim()).length;
    if (present && present !== names.length) errors.push(`Configure all ${provider} variables, or leave that provider unconfigured.`);
  }
  return errors;
}
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = deploymentProblems(process.env);
  if (errors.length) { for (const message of errors) console.error(message); process.exitCode = 1; }
  else console.log("Hosted configuration checks passed. No credentials were printed.");
}

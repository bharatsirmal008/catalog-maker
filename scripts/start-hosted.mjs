import "dotenv/config";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { deploymentProblems } from "./deployment-check.mjs";
const errors = deploymentProblems(process.env);
const config = JSON.parse(await readFile(".next/required-server-files.json", "utf8")).config;
if (config.env.NEXT_PUBLIC_CATALOG_CLOUDINARY_CLOUD_NAME !== process.env.CLOUDINARY_CLOUD_NAME) errors.push("Cloudinary cloud changed since build; rebuild before starting.");
const wooOrigin = process.env.WOOCOMMERCE_STORE_URL ? new URL(process.env.WOOCOMMERCE_STORE_URL).origin : "";
if (config.env.NEXT_PUBLIC_CATALOG_WOO_ORIGIN !== wooOrigin) errors.push("WooCommerce origin changed since build; rebuild before starting.");
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push("PORT is invalid.");
if (errors.length) { for (const message of errors) console.error(message); process.exit(1); }
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", String(port)], { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", () => { console.error("Could not start hosted server"); process.exitCode = 1; });
child.on("exit", (code) => process.exit(code ?? 1));

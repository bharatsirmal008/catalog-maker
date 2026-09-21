import "server-only";
import { isIP } from "node:net";
import { IntegrationError } from "../errors";
export type WooConfig = { origin: string; key: string; secret: string };
export function loadWooConfig(env: Record<string, string | undefined> = process.env): WooConfig {
  try {
    const url = new URL(env.WOOCOMMERCE_STORE_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash || isIP(url.hostname) || !url.hostname.includes(".") || /\.(localhost|local|internal|example)$/.test(url.hostname)) throw new Error();
    const key = env.WOOCOMMERCE_CONSUMER_KEY ?? "", secret = env.WOOCOMMERCE_CONSUMER_SECRET ?? "";
    if (!/^ck_[a-f0-9]{40}$/.test(key) || !/^cs_[a-f0-9]{40}$/.test(secret)) throw new Error();
    return { origin: url.origin, key, secret };
  } catch { throw new IntegrationError("CONFIGURATION"); }
}
export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}

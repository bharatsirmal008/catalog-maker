import "server-only";
import { IntegrationError } from "../errors";
export const SHOPIFY_API_VERSION = "2026-07";
export function normalizeShopifyDomain(input: string): string {
  const value = input.trim().toLowerCase();
  // Only canonical Shopify-hosted domains. No custom storefront destinations.
  if (!/^(?:https:\/\/)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com\/?$/.test(value)) throw new IntegrationError("CONFIGURATION");
  return value.replace(/^https:\/\//, "").replace(/\/$/, "");
}
export type ShopifyConfig = { domain: string; clientId: string; clientSecret: string; version: typeof SHOPIFY_API_VERSION };
export function loadShopifyConfig(env: Record<string, string | undefined> = process.env): ShopifyConfig {
  if (!env.SHOPIFY_STORE_URL || !env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET || [env.SHOPIFY_CLIENT_ID, env.SHOPIFY_CLIENT_SECRET].some((s) => s.startsWith("replace-"))) throw new IntegrationError("CONFIGURATION");
  if (env.SHOPIFY_API_VERSION && env.SHOPIFY_API_VERSION !== SHOPIFY_API_VERSION) throw new IntegrationError("CONFIGURATION");
  return { domain: normalizeShopifyDomain(env.SHOPIFY_STORE_URL), clientId: env.SHOPIFY_CLIENT_ID, clientSecret: env.SHOPIFY_CLIENT_SECRET, version: SHOPIFY_API_VERSION };
}

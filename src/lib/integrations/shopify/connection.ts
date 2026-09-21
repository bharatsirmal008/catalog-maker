import "server-only";
import { ShopifyClient } from "./client";
import { loadShopifyConfig, type ShopifyConfig } from "./config";
import { SHOP_QUERY, shopSchema } from "./products";
import { IntegrationError } from "../errors";
export async function checkShopifyConnection(config: ShopifyConfig = loadShopifyConfig(), client = new ShopifyClient(config)) {
  const scopes = await client.grantedScopes();
  if (!["read_products", "read_inventory"].every((scope) => scopes.includes(scope) || scopes.includes(scope.replace("read_", "write_")))) throw new IntegrationError("PERMISSION");
  const { shop } = await client.query(SHOP_QUERY, {}, shopSchema);
  if (shop.myshopifyDomain.toLowerCase() !== config.domain) throw new IntegrationError("CONFIGURATION");
  return { storeName: shop.name, storeDomain: shop.myshopifyDomain, shopId: shop.id, currency: shop.currencyCode, apiVersion: config.version, permissions: ["read_products", "read_inventory"] };
}

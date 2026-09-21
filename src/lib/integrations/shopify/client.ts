import "server-only";
import { z } from "zod";
import { IntegrationError } from "../errors";
import { normalizeShopifyDomain, SHOPIFY_API_VERSION, type ShopifyConfig } from "./config";
type Dependencies = { fetch?: typeof fetch; sleep?: (milliseconds: number) => Promise<void>; timeoutMs?: number };
const envelope = z.object({ data: z.unknown().optional(), errors: z.array(z.object({ extensions: z.object({ code: z.string().optional() }).passthrough().optional() }).passthrough()).optional(), extensions: z.object({ cost: z.object({ requestedQueryCost: z.number().optional(), throttleStatus: z.object({ currentlyAvailable: z.number(), restoreRate: z.number() }).optional() }).optional() }).optional() });
const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive(), scope: z.string() });
export class ShopifyClient {
  private token?: { value: string; expiresAt: number; scopes: string[] };
  private tokenRequest?: Promise<string>;
  private readonly fetcher: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly timeoutMs: number;
  private readonly domain: string;
  constructor(private readonly config: ShopifyConfig, dependencies: Dependencies = {}) {
    this.domain = normalizeShopifyDomain(config.domain);
    if (config.version !== SHOPIFY_API_VERSION) throw new IntegrationError("CONFIGURATION");
    this.fetcher = dependencies.fetch ?? fetch;
    this.sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.timeoutMs = dependencies.timeoutMs ?? 10000;
  }
  private async request(path: string, body: string, headers: Record<string, string>): Promise<{ value: unknown; response: Response }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`https://${this.domain}${path}`, { method: "POST", headers, body, signal: controller.signal, redirect: "error", cache: "no-store" });
      if ([401, 403].includes(response.status)) throw new IntegrationError(response.status === 401 ? "AUTHENTICATION" : "PERMISSION");
      if (response.status === 429 || response.status >= 500) {
        // Do not expose remote bodies or headers; carry only a validated delay.
        const failure = new RetryError(response.status === 429 ? "THROTTLED" : "REMOTE", retryDelay(response.headers.get("retry-after")));
        throw failure;
      }
      if (!response.ok) throw new IntegrationError("REMOTE");
      const text = await response.text();
      if (text.length > 8_000_000) throw new IntegrationError("INVALID_RESPONSE");
      try { return { value: JSON.parse(text), response }; } catch { throw new IntegrationError("INVALID_RESPONSE"); }
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(controller.signal.aborted ? "TIMEOUT" : "NETWORK", true);
    } finally { clearTimeout(timer); }
  }
  private async retry<T>(action: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await action(); } catch (error) {
        if (!(error instanceof IntegrationError) || !error.retryable || attempt >= 2) throw error;
        const delay = error instanceof RetryError ? error.delay : 500 * 2 ** attempt;
        if (delay > 30000) throw error; // Do not retry before a long Retry-After.
        await this.sleep(delay);
      }
    }
  }
  async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60000) return this.token.value;
    if (this.tokenRequest) return this.tokenRequest;
    this.tokenRequest = this.retry(async () => {
      const { value } = await this.request("/admin/oauth/access_token", new URLSearchParams({ grant_type: "client_credentials", client_id: this.config.clientId, client_secret: this.config.clientSecret }).toString(), { "Content-Type": "application/x-www-form-urlencoded" });
      const parsed = tokenSchema.safeParse(value);
      if (!parsed.success) throw new IntegrationError("INVALID_RESPONSE");
      this.token = { value: parsed.data.access_token, expiresAt: Date.now() + parsed.data.expires_in * 1000, scopes: parsed.data.scope.split(",").map((s) => s.trim()) };
      return this.token.value;
    });
    try { return await this.tokenRequest; } finally { this.tokenRequest = undefined; }
  }
  async grantedScopes() { await this.accessToken(); return this.token!.scopes; }
  async query<T>(query: string, variables: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
    const token = await this.accessToken();
    return this.retry(async () => {
      const { value, response } = await this.request(`/admin/api/${this.config.version}/graphql.json`, JSON.stringify({ query, variables }), { "Content-Type": "application/json", "X-Shopify-Access-Token": token });
      const servedVersion = response.headers.get("x-shopify-api-version");
      if (servedVersion && servedVersion !== this.config.version) throw new IntegrationError("CONFIGURATION");
      const parsed = envelope.safeParse(value);
      if (!parsed.success) throw new IntegrationError("INVALID_RESPONSE");
      if (parsed.data.errors?.length) {
        const codes = parsed.data.errors.map((error) => error.extensions?.code);
        if (codes.includes("ACCESS_DENIED")) throw new IntegrationError("PERMISSION");
        if (codes.includes("THROTTLED")) {
          const cost = parsed.data.extensions?.cost;
          const status = cost?.throttleStatus;
          const delay = status && status.restoreRate > 0 ? Math.max(1000, Math.ceil(((cost?.requestedQueryCost ?? 100) - status.currentlyAvailable) / status.restoreRate * 1000)) : 1000;
          throw new RetryError("THROTTLED", delay);
        }
        throw new IntegrationError("REMOTE");
      }
      const result = schema.safeParse(parsed.data.data);
      if (!result.success) throw new IntegrationError("INVALID_RESPONSE");
      return result.data;
    });
  }
}
class RetryError extends IntegrationError { constructor(code: "THROTTLED" | "REMOTE", readonly delay: number) { super(code, true); } }
function retryDelay(value: string | null) { if (!value) return 1000; const seconds = Number(value); return Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Math.max(0, Date.parse(value) - Date.now()) || 1000; }

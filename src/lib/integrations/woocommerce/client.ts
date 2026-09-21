import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { z } from "zod";
import { IntegrationError } from "../errors";
import { publicIPv4, type WooConfig } from "./config";
export type WooResponse = { status: number; headers: Headers; body: string };
export type WooTransport = (url: URL, authorization: string, signal: AbortSignal) => Promise<WooResponse>;
// Resolve once, validate every IPv4 answer, then pin the socket lookup. TLS still
// verifies the configured hostname. No redirect or arbitrary proxy is supported.
export const secureWooTransport: WooTransport = async (url, authorization, signal) => {
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(({ address }) => !publicIPv4(address))) throw new IntegrationError("CONFIGURATION");
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", agent: false, family: 4, signal, headers: { Authorization: authorization, Accept: "application/json" }, lookup: (_host, _options, callback) => callback(null, addresses[0].address, 4) }, (res) => {
      const chunks: Buffer[] = []; let length = 0;
      res.on("data", (chunk: Buffer) => { length += chunk.length; if (length > 8 * 1024 * 1024) { req.destroy(new IntegrationError("INVALID_RESPONSE")); return; } chunks.push(chunk); });
      res.on("error", reject);
      res.on("end", () => { const headers = new Headers(); for (const [key, value] of Object.entries(res.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(",") : value); resolve({ status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString("utf8") }); });
    }); req.on("error", reject); req.end();
  });
};
export class WooClient {
  private deadline = Date.now() + 8 * 60 * 1000;
  constructor(readonly config: WooConfig, private transport: WooTransport = secureWooTransport, private sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)), private timeoutMs = 10000) {}
  async get<T>(path: string, schema: z.ZodType<T>, params: Record<string, string> = {}): Promise<{ data: T; headers: Headers }> {
    if (!/^(products(?:\/\d+(?:\/variations)?)?|products\/categories|settings\/general\/woocommerce_currency)$/.test(path)) throw new IntegrationError("CONFIGURATION");
    const url = new URL(`/wp-json/wc/v3/${path}`, this.config.origin);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (Date.now() >= this.deadline) throw new IntegrationError("TIMEOUT");
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let wait = 250 * 2 ** attempt;
      try {
        const response = await Promise.race([this.transport(url, `Basic ${Buffer.from(`${this.config.key}:${this.config.secret}`).toString("base64")}`, controller.signal), new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new IntegrationError("TIMEOUT", true)); }, Math.min(this.timeoutMs, this.deadline - Date.now())); })]);
        if (response.status === 401) throw new IntegrationError("AUTHENTICATION");
        if (response.status === 403) throw new IntegrationError("PERMISSION");
        if (response.status === 429 || response.status >= 500) {
          const retry = response.headers.get("retry-after");
          if (retry) wait = /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now());
          throw new IntegrationError(response.status === 429 ? "THROTTLED" : "REMOTE", true);
        }
        if (response.status < 200 || response.status >= 300) throw new IntegrationError("REMOTE");
        try { return { data: schema.parse(JSON.parse(response.body)), headers: response.headers }; } catch { throw new IntegrationError("INVALID_RESPONSE"); }
      } catch (error) {
        const safe = error instanceof IntegrationError ? error : new IntegrationError("NETWORK", true);
        if (!safe.retryable || attempt === 2 || !Number.isFinite(wait) || wait > 30000) throw safe;
      } finally { clearTimeout(timer); }
      await this.sleep(wait);
    }
    throw new IntegrationError("NETWORK");
  }
  async *pages<T extends { id: number }>(path: string, schema: z.ZodType<T>, params: Record<string, string> = {}): AsyncGenerator<T[]> {
    const ids = new Set<number>(); let totalPages: number | undefined;
    for (let page = 1; page <= 100; page++) {
      const result = await this.get(path, z.array(schema), { ...params, per_page: "50", page: String(page), orderby: "id", order: "asc" });
      const header = result.headers.get("x-wp-totalpages");
      if (header === null || !/^\d+$/.test(header)) throw new IntegrationError("PAGINATION");
      const count = Number(header);
      if (count > 100 || (totalPages !== undefined && count !== totalPages) || (page < count && !result.data.length)) throw new IntegrationError("PAGINATION");
      totalPages = count;
      for (const row of result.data) { if (ids.has(row.id)) throw new IntegrationError("PAGINATION"); ids.add(row.id); }
      yield result.data;
      if (page >= count) return;
    }
    throw new IntegrationError("PAGINATION");
  }
}

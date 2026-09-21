import "server-only";
export type IntegrationCode = "CONFIGURATION" | "AUTHENTICATION" | "PERMISSION" | "TIMEOUT" | "NETWORK" | "THROTTLED" | "REMOTE" | "INVALID_RESPONSE" | "PAGINATION" | "NOT_FOUND";
const messages: Record<IntegrationCode, string> = {
  NOT_FOUND: "The source product no longer exists.",
  CONFIGURATION: "Source configuration is missing or invalid.", AUTHENTICATION: "Source authentication failed. Check installation and rotate credentials if needed.",
  PERMISSION: "The source did not grant the required read permissions.", TIMEOUT: "The source request timed out. Try again later.", NETWORK: "The source could not be reached.",
  THROTTLED: "The source rate limit was reached. Try again later.", REMOTE: "The source rejected the request.", INVALID_RESPONSE: "The source returned unexpected data.", PAGINATION: "Source pagination was incomplete or exceeded the safety limit.",
};
export class IntegrationError extends Error {
  constructor(public readonly code: IntegrationCode, public readonly retryable = false) { super(messages[code]); this.name = "IntegrationError"; }
}

import "server-only";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { IntegrationError } from "@/lib/integrations/errors";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export async function endpoint(action: () => Promise<Response>): Promise<Response> {
  try { return await action(); } catch (error) {
    if (error instanceof IntegrationError) return json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, error.code === "CONFIGURATION" ? 409 : 502);
    if (error instanceof ZodError) return json({ error: { message: "Invalid request", issues: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) } }, 400);
    if (error instanceof ApiError) return json({ error: { message: error.message } }, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return json({ error: { message: "This unique identifier is already in use" } }, 409);
      if (error.code === "P2025") return json({ error: { message: "Record not found" } }, 404);
      if (error.code === "P2003") return json({ error: { message: "Related record is missing or still in use" } }, 409);
      if (error.code === "P2034") return json({ error: { message: "Concurrent update; please retry" } }, 409);
    }
    console.error("API operation failed", { type: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: { message: "Service unavailable. Please try again." } }, 500);
  }
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "Send application/json");
  const body = await request.text();
  if (body.length > 65536) throw new ApiError(413, "Request body is too large");
  try { return JSON.parse(body); } catch { throw new ApiError(400, "Invalid JSON"); }
}
export function requireSameOrigin(request: Request) {
  const expected = process.env.APP_URL ?? (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined);
  if (!expected || request.headers.get("origin") !== new URL(expected).origin) throw new ApiError(403, "Request origin is not allowed");
}

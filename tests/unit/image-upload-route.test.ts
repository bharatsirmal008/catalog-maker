import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: vi.fn() }));
import { requireAdmin } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/http";
import { POST } from "@/app/api/admin/images/route";
const remote = vi.fn();
beforeEach(() => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "test-shop"); vi.stubEnv("CLOUDINARY_API_KEY", "test-key"); vi.stubEnv("CLOUDINARY_API_SECRET", "test-secret");
  vi.stubGlobal("fetch", remote); remote.mockReset(); vi.mocked(requireAdmin).mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function request(bytes = new Uint8Array([137,80,78,71,13,10,26,10])) {
  const body = new FormData(); body.set("file", new File([bytes], "test.png", { type: "image/png" }));
  return new Request("http://localhost:3000/api/admin/images", { method: "POST", body, headers: { Origin: "http://localhost:3000" } });
}
it("requires admin authorization before upload", async () => {
  vi.mocked(requireAdmin).mockRejectedValue(new ApiError(401, "Administrator sign-in required"));
  expect((await POST(request())).status).toBe(401); expect(remote).not.toHaveBeenCalled();
});
it("honors origin rejection from the shared auth guard", async () => {
  vi.mocked(requireAdmin).mockRejectedValue(new ApiError(403, "Request origin is not allowed"));
  const req = request(); expect((await POST(req)).status).toBe(403); expect(requireAdmin).toHaveBeenCalledWith(req); expect(remote).not.toHaveBeenCalled();
});
it("reports missing configuration without contacting Cloudinary", async () => {
  vi.stubEnv("CLOUDINARY_API_SECRET", ""); expect((await POST(request())).status).toBe(409); expect(remote).not.toHaveBeenCalled();
});
it("rejects disguised files and oversized requests", async () => {
  expect((await POST(request(new TextEncoder().encode("<svg/>")))).status).toBe(400);
  const req = request(); req.headers.set("content-length", String(6*1024*1024));
  expect((await POST(req)).status).toBe(413); expect(remote).not.toHaveBeenCalled();
});
it("signs uploads server-side and returns only safe image metadata", async () => {
  remote.mockResolvedValue(Response.json({ secure_url: "https://res.cloudinary.com/test-shop/image/upload/v1/a.png", format: "png", secret: "not-returned" }));
  const response = await POST(request()); expect(response.status).toBe(201);
  const body = remote.mock.calls[0][1].body as FormData;
  expect(body.get("signature")).toBe(createHash("sha256").update(`public_id=${body.get("public_id")}&timestamp=${body.get("timestamp")}test-secret`).digest("hex"));
  expect(body.has("api_secret")).toBe(false);
  expect(await response.json()).toEqual({ data: { imageUrl: "https://res.cloudinary.com/test-shop/image/upload/v1/a.png", altText: null } });
});
it("sanitizes upstream failures", async () => {
  remote.mockResolvedValue(new Response("sensitive upstream details", { status: 401 }));
  const response = await POST(request()); expect(response.status).toBe(502); expect(await response.text()).not.toContain("sensitive");
});

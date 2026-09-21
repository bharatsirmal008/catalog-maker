import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
import { changedProductsFilter } from "@/lib/integrations/shopify/sync";
describe("Shopify synchronization boundary", () => {
  it("uses full enumeration without a successful checkpoint", () => {
    expect(changedProductsFilter(null, new Date("2026-09-21T12:00:00Z"))).toBeUndefined();
  });
  it("includes timestamp ties and a five-minute overlap with a fixed upper bound", () => {
    expect(changedProductsFilter(new Date("2026-09-21T11:00:00Z"), new Date("2026-09-21T12:00:00Z"))).toBe("updated_at:>='2026-09-21T10:55:00.000Z' updated_at:<='2026-09-21T12:00:00.000Z'");
  });
});

import { randomUUID } from "node:crypto";
export function uniqueSlug(name: string) {
  const stem = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65).replace(/-$/, "") || "item";
  return `${stem}-${randomUUID()}`;
}

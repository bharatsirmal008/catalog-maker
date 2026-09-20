import { endpoint, json } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/session";
export async function GET() { return endpoint(async () => json({ data: await requireAdmin() })); }

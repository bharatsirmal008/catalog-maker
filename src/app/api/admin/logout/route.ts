import { endpoint, json, requireSameOrigin } from "@/lib/api/http";
import { signOut } from "@/lib/auth/session";
export async function POST(request: Request) { return endpoint(async () => { requireSameOrigin(request); await signOut(); return json({ data: { signedOut: true } }); }); }

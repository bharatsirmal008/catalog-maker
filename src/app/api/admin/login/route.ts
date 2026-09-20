import { endpoint, json, readJson, requireSameOrigin } from "@/lib/api/http";
import { loginSchema } from "@/lib/validations/catalog";
import { signIn } from "@/lib/auth/session";
export async function POST(request: Request) { return endpoint(async () => { requireSameOrigin(request); const input = loginSchema.parse(await readJson(request)); return json({ data: await signIn(input.email, input.password) }); }); }

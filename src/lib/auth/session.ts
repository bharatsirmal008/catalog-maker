import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { ApiError, requireSameOrigin } from "@/lib/api/http";
import { hashPassword, verifyPassword } from "./password";

const cookieName = process.env.NODE_ENV === "production" ? "__Host-catalog-admin" : "catalog-admin";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const lifetime = 8 * 60 * 60;
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };
let dummyHash: Promise<string> | undefined;

export async function currentAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: tokenHash(token) }, include: { admin: { select: { id: true, email: true } } } });
  return session && session.expiresAt > new Date() ? session.admin : null;
}
export async function requireAdmin(request?: Request) {
  const admin = await currentAdmin();
  if (!admin) throw new ApiError(401, "Administrator sign-in required");
  if (request && !["GET", "HEAD"].includes(request.method)) requireSameOrigin(request);
  return admin;
}
export async function signIn(email: string, password: string) {
  const now = Date.now();
  const window = Math.floor(now / 900000);
  const key = tokenHash(`${email}:${window}`);
  const attempt = await prisma.loginThrottle.upsert({
    where: { key }, create: { key, expiresAt: new Date((window + 1) * 900000) },
    update: { attempts: { increment: 1 } },
  });
  if (attempt.attempts > 10) throw new ApiError(429, "Too many attempts. Try again in 15 minutes.");
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  const valid = await verifyPassword(password, admin?.passwordHash ?? await dummyHash);
  if (!valid || !admin?.passwordHash) throw new ApiError(401, "Invalid email or password");
  const store = await cookies();
  const oldToken = store.get(cookieName)?.value;
  if (oldToken) await prisma.adminSession.deleteMany({ where: { tokenHash: tokenHash(oldToken) } });
  const token = randomBytes(32).toString("hex");
  await prisma.adminSession.create({ data: { tokenHash: tokenHash(token), adminId: admin.id, expiresAt: new Date(now + lifetime * 1000) } });
  store.set(cookieName, token, { ...cookieOptions, maxAge: lifetime });
  await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.loginThrottle.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return { id: admin.id, email: admin.email };
}
export async function signOut() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  store.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
}

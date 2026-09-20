import "dotenv/config";
import { z } from "zod";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const email = z.email().parse(process.env.ADMIN_SETUP_EMAIL).toLowerCase();
  const password = z.string().min(14).max(256).parse(process.env.ADMIN_SETUP_PASSWORD);
  if (await prisma.adminUser.findUnique({ where: { email } })) throw new Error("Existing account: setup never overwrites passwords");
  await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword(password) } });
  console.log("Administrator created. Sign in at /admin/login.");
}
main().catch(() => { console.error("Setup failed. Supply a valid ADMIN_SETUP_EMAIL and unique password (14–256 characters); existing accounts are not overwritten."); process.exitCode = 1; }).finally(async () => {
  delete process.env.ADMIN_SETUP_PASSWORD;
  await prisma.$disconnect();
});

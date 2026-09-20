import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/LoginForm";
export const dynamic = "force-dynamic";
export default async function AdminLogin() {
  if (await currentAdmin()) redirect("/admin");
  return <main className="mx-auto w-full max-w-md px-5 py-20"><Link href="/">← Catalog Maker</Link><h1 className="mb-8 mt-8 text-3xl font-bold">Administrator sign in</h1><LoginForm /></main>;
}

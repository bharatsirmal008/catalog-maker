"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error?.message ?? "Sign-in failed"); }
      router.replace("/admin"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to sign in"); } finally { setPending(false); }
  }}>
    <label className="block">Email<input className="mt-2 w-full rounded border border-slate-300 p-3" required autoComplete="username" type="email" name="email" /></label>
    <label className="block">Password<input className="mt-2 w-full rounded border border-slate-300 p-3" required autoComplete="current-password" type="password" name="password" maxLength={256} /></label>
    {message && <p role="alert" className="text-red-800">{message}</p>}
    <button disabled={pending} className="w-full rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}

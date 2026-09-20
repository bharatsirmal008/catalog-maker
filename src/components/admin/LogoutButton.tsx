"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  return <><button className="rounded border border-slate-400 px-4 py-3" onClick={async () => {
    try { const response = await fetch("/api/admin/logout", { method: "POST" }); if (!response.ok) throw new Error(); router.replace("/admin/login"); router.refresh(); } catch { setError("Could not sign out. Please retry."); }
  }}>Sign out</button>{error && <p role="alert">{error}</p>}</>;
}

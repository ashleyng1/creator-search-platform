"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, setAuth } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", brand_name: "", job_title: "", industry: "", role: "marketing_professional",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await auth.register(form);
      setAuth(data.access_token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-8">
      <div className="w-full max-w-lg rounded-xl border border-surface-border bg-white p-8 shadow-card">
        <h1 className="text-xl font-semibold">Create account</h1>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          {([["full_name", "Full name"], ["email", "Email"], ["password", "Password"], ["brand_name", "Brand"], ["job_title", "Title"], ["industry", "Industry"]] as const).map(([key, label]) => (
            <div key={key} className={key === "email" || key === "password" ? "sm:col-span-2" : ""}>
              <label className="text-xs font-semibold uppercase text-gray-500">{label}</label>
              <input
                type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="input-field mt-1"
                required={["email", "password", "full_name"].includes(key)}
              />
            </div>
          ))}
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary sm:col-span-2">{loading ? "Creating..." : "Create account"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

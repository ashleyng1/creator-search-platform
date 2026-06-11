"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, setAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@brand.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await auth.login(email, password);
      setAuth(data.access_token, data.user);
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-brand-600">CreatorFind</span>
          <p className="mt-1 text-sm text-gray-500">Influencer marketing platform</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field mt-1" required />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field mt-1" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          No account? <Link href="/register" className="font-medium text-brand-600 hover:underline">Register</Link>
        </p>
        <p className="mt-2 text-center text-xs text-gray-400">demo@brand.com / demo1234</p>
      </div>
    </div>
  );
}

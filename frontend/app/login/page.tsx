"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, setAuth } from "@/lib/api";

function SocialButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
    >
      {label}
    </button>
  );
}

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  function startOAuth(provider: "google" | "apple" | "meta") {
    window.location.href = auth.oauthStartUrl(provider);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="Creator" className="mx-auto h-9 w-auto" />
          <p className="mt-1 text-sm text-neutral-500">Influencer marketing platform</p>
        </div>

        <div className="space-y-2">
          <SocialButton label="Continue with Google" onClick={() => startOAuth("google")} />
          <SocialButton label="Continue with Apple" onClick={() => startOAuth("apple")} />
          <SocialButton label="Continue with Instagram" onClick={() => startOAuth("meta")} />
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-400">or</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-neutral-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field mt-1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-neutral-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field mt-1"
              required
            />
          </div>
          {error && <p className="text-sm text-brand-800">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          No account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Register
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-neutral-400">demo@brand.com / demo1234</p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth, setAuth } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [form, setForm] = useState({
    password: "",
    full_name: "",
    brand_name: "",
    job_title: "",
    industry: "",
    role: "marketing_professional",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await auth.requestOtp(email);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await auth.verifyOtp({ email, code, ...form });
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
        <p className="mt-1 text-sm text-neutral-500">
          {step === 1 ? "Step 1 of 2 — verify your email" : "Step 2 of 2 — complete your profile"}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
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
            {error && <p className="text-sm text-brand-800">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending..." : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase text-neutral-500">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input-field mt-1 tracking-widest"
                required
              />
              <p className="mt-1 text-xs text-neutral-400">Sent to {email}</p>
            </div>
            {(
              [
                ["full_name", "Full name"],
                ["password", "Password"],
                ["brand_name", "Brand"],
                ["job_title", "Title"],
                ["industry", "Industry"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className={key === "password" || key === "full_name" ? "sm:col-span-2" : ""}>
                <label className="text-xs font-semibold uppercase text-neutral-500">{label}</label>
                <input
                  type={key === "password" ? "password" : "text"}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="input-field mt-1"
                  required={key === "password" || key === "full_name"}
                />
              </div>
            ))}
            {error && <p className="sm:col-span-2 text-sm text-brand-800">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                Back
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link href="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

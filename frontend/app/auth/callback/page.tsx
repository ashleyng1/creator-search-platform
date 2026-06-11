"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { auth, setAuth } from "@/lib/api";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing sign-in token");
      return;
    }
    setAuth(token, {});
    auth
      .me()
      .then((user) => {
        setAuth(token, user);
        router.replace("/dashboard");
      })
      .catch(() => {
        setError("Could not complete sign-in");
      });
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
        <p className="text-sm text-brand-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <p className="text-sm text-neutral-500">Completing sign-in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
          <p className="text-sm text-neutral-500">Completing sign-in...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

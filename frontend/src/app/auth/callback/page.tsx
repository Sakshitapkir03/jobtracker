"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import type { User } from "@/types";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Store token first so the /auth/me call includes it via the interceptor
    localStorage.setItem("jt_token", token);
    authApi
      .me()
      .then((r) => {
        login(token, r.data as User);
        setAuth(token, r.data);
        router.push("/dashboard");
      })
      .catch(() => router.push("/login"));
  }, [params, router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

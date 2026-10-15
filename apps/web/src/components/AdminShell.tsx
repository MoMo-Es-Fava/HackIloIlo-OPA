"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, getAuthToken } from "@/lib/api";
import AuthControls from "./AuthControls";

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!getAuthToken()) {
      router.replace("/login?next=%2Fadmin");
      return;
    }
    api.getMe().then((user) => {
      if (!alive) return;
      setSessionRole(user.role);
      setReady(true);
    }).catch((error: unknown) => {
      if (!alive) return;
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login?next=%2Fadmin");
        return;
      }
      setLoadError(error instanceof ApiError ? error.message : "Could not verify the current session.");
      setReady(true);
    });
    return () => { alive = false; };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <Link href="/" className="text-sm font-bold tracking-wide text-paddy-d">ALAGARAB</Link>
            <span className="mx-2 text-sub/50">/</span>
            <span className="text-sm font-semibold text-ink">Administration</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-sub sm:inline">Admin workspace</span>
            <AuthControls tone="light" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {!ready ? <p role="status" className="py-16 text-center text-sm text-sub">Checking admin access…</p> : <>
          {sessionRole && sessionRole !== "ADMIN" && <p role="status" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">This session is signed in as <strong>{sessionRole}</strong>. User management still requires an ADMIN account; the API will enforce that role.</p>}
          {loadError && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>}
          {children}
        </>}
      </main>
    </div>
  );
}

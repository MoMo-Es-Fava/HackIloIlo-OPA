"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthToken, setAuthToken } from "@/lib/api";

export default function AuthControls({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const update = () => setSignedIn(Boolean(getAuthToken()));
    update();
    window.addEventListener("irpc-auth-change", update);
    return () => window.removeEventListener("irpc-auth-change", update);
  }, []);
  if (!signedIn) return null;
  const colors = tone === "light"
    ? "border-line text-ink hover:bg-mist"
    : "border-white/30 text-white/90 hover:bg-white/10";
  return <button type="button" onClick={() => { setAuthToken(null, false); router.replace("/"); }} className={`min-h-10 rounded-lg border px-3 text-sm font-bold transition-colors ${colors}`}>Sign out</button>;
}

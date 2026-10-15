"use client";

import { AccountType, Language, Role } from "@irpc/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

const fieldClass = "mt-1 min-h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink outline-none focus:border-paddy focus:ring-2 focus:ring-paddy/20";
const labelClass = "block text-sm font-bold text-ink";
const isValidNext = (value: string | null): value is string => !!value && (value === "/buyer" || value.startsWith("/buyer/") || value === "/staff" || value.startsWith("/staff/"));

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registering = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const values = new FormData(event.currentTarget);
    const phone = String(values.get("phone") ?? "").trim();
    const pin = String(values.get("pin") ?? "");
    try {
      const result = registering
        ? await api.register({
            name: String(values.get("name") ?? "").trim(),
            phone,
            pin,
            accountType: String(values.get("accountType")) as AccountType,
            language: Language.HIL,
            municipality: String(values.get("municipality") ?? "").trim() || undefined,
            consent: true,
          })
        : await api.login(phone, pin);
      const staff = result.user.role === Role.ADMIN || result.user.role === Role.PLANT_STAFF || result.user.role === Role.MAO_STAFF;
      const defaultPath = staff ? "/staff" : "/buyer";
      const requested = new URLSearchParams(window.location.search).get("next");
      const next = isValidNext(requested) && requested.startsWith(staff ? "/staff" : "/buyer")
        ? requested
        : defaultPath;
      router.replace(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:grid sm:place-items-center sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg text-ink">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-husk font-bold">IR</span>
          <span className="font-bold tracking-wide">IRPC</span>
        </Link>
        <section className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-raised sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-paddy-d">{registering ? "New account" : "Welcome back"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{registering ? "Create your account" : "Sign in to IRPC"}</h1>
          <p className="mt-2 text-sub">{registering ? "Use your phone number and a temporary PIN while SMS sign-in is being set up." : "Sign in with your phone number and PIN. SMS verification will be added later."}</p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
            {registering && <>
              <label className={labelClass}>Full name<input className={fieldClass} name="name" autoComplete="name" minLength={2} maxLength={100} required /></label>
              <label className={labelClass}>Account type<select className={fieldClass} name="accountType" defaultValue={AccountType.BUYER}>
                {Object.values(AccountType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
              </select></label>
              <label className={labelClass}>Municipality <span className="font-normal text-sub">(optional)</span><input className={fieldClass} name="municipality" autoComplete="address-level2" maxLength={100} /></label>
            </>}
            <label className={labelClass}>Philippine mobile number<input className={fieldClass} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" pattern="(?:\\+?63|0)9[0-9]{9}" title="Enter a Philippine mobile number, such as 0917 123 4567" required /></label>
            <label className={labelClass}>PIN<input className={fieldClass} name="pin" type="password" inputMode="numeric" autoComplete={registering ? "new-password" : "current-password"} minLength={4} maxLength={6} pattern="[0-9]{4,6}" title="PIN must be 4 to 6 digits" required /></label>
            {registering && <label className="flex items-start gap-3 text-sm text-sub"><input className="mt-1 h-4 w-4 accent-paddy-d" type="checkbox" name="consent" required /><span>I agree to the data privacy notice and consent to IRPC using my account details.</span></label>}
            {error && <p role="alert" className="rounded-xl bg-clay-l px-3.5 py-3 text-sm font-bold text-clay">{error}</p>}
            <button className="mt-1 min-h-12 rounded-xl bg-paddy-d px-5 font-bold text-white transition-colors hover:bg-paddy disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>
              {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-sub">
            {registering ? "Already registered? " : "New to IRPC? "}
            <Link className="font-bold text-paddy-d underline" href={registering ? "/login" : "/register"}>{registering ? "Sign in" : "Create an account"}</Link>
          </p>
          {!registering && <details className="mt-6 rounded-xl bg-mist px-4 py-3 text-sm text-sub">
            <summary className="cursor-pointer font-bold text-ink">Development demo accounts</summary>
            <p className="mt-2">Seeded accounts use PIN <strong>1234</strong>. Admin: <strong>0917 000 0001</strong>; plant staff: <strong>0917 000 0002</strong>. Farmer, cooperative, and buyer accounts use numbers ending 0003–0007.</p>
          </details>}
        </section>
        <p className="mt-4 text-center text-xs text-sub">Temporary phone and PIN sign-in for development. SMS verification is not active yet.</p>
      </div>
    </main>
  );
}

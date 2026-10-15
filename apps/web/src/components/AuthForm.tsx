"use client";

import { AccountType, Language, Role } from "@irpc/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";

const fieldClass = "mt-1 min-h-12 w-full rounded-xl border border-white/20 bg-white/10 px-3.5 text-base text-white outline-none placeholder:text-white/50 focus:border-husk focus:ring-2 focus:ring-husk/30";
const labelClass = "block text-sm font-bold text-white/90";
const isValidNext = (value: string | null): value is string => !!value && ["/buyer", "/staff", "/admin"].some((base) => value === base || value.startsWith(`${base}/`));

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationPhone, setVerificationPhone] = useState("");
  const registering = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const values = new FormData(event.currentTarget);
    const phone = String(values.get("phone") ?? "").trim();
    const pin = String(values.get("pin") ?? "");
    try {
      if (registering && !codeSent) {
        await api.requestRegistrationCode(phone);
        setVerificationPhone(phone);
        setCodeSent(true);
        return;
      }
      const result = registering
        ? await api.register({
            name: String(values.get("name") ?? "").trim(),
            phone,
            pin,
            accountType: AccountType.BUYER,
            language: Language.HIL,
            verificationCode: String(values.get("verificationCode") ?? ""),
            consent: true,
          })
        : await api.login(phone, pin);
      const staff = result.user.role === Role.PLANT_STAFF || result.user.role === Role.MAO_STAFF;
      const defaultPath = result.user.role === Role.ADMIN ? "/admin" : staff ? "/staff" : "/buyer";
      const requested = new URLSearchParams(window.location.search).get("next");
      const allowedNext = result.user.role === Role.ADMIN ? "/admin" : staff ? "/staff" : "/buyer";
      const next = isValidNext(requested) && (requested === allowedNext || requested.startsWith(`${allowedNext}/`))
        ? requested
        : defaultPath;
      router.replace(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : registering
        ? "Could not create your account. Please try again."
        : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const busyMessage = registering
    ? codeSent ? "Creating your account…" : "Sending your verification code…"
    : "Signing you in…";

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-10 sm:py-14">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image
          src="/images/nagacadan-farmers.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink/65" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink/70 via-ink/45 to-paddy-d/70" />
      </div>
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="brand-logo-link inline-flex min-h-11 items-center gap-3 rounded-lg text-white focus-visible:outline-white">
          <BrandLogo size={40} />
          <span className="font-bold tracking-wide">ALAGARAB</span>
        </Link>
        <section aria-busy={busy} className="mt-6 rounded-3xl border border-white/20 bg-white/[0.12] p-6 text-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-husk">{registering ? "New account" : "Welcome back"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{registering ? "Create your account" : "Sign in to ALAGARAB"}</h1>
          <p className="mt-2 text-white/75">{registering ? "Enter your details, then verify your mobile number with the code sent by SMS." : "Sign in with your phone number and PIN."}</p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={submit} aria-busy={busy}>
            {registering && <>
              <label className={labelClass}>Full name<input className={fieldClass} name="name" autoComplete="name" minLength={2} maxLength={100} required /></label>
            </>}
            <label className={labelClass}>Philippine mobile number<input className={fieldClass} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" pattern="(?:\\+?63|0)9[0-9]{9}" title="Enter a Philippine mobile number, such as 0917 123 4567" required /></label>
            <label className={labelClass}>PIN<input className={fieldClass} name="pin" type="password" inputMode="numeric" autoComplete={registering ? "new-password" : "current-password"} minLength={4} maxLength={6} pattern="[0-9]{4,6}" title="PIN must be 4 to 6 digits" required /></label>
            {registering && codeSent && <>
              <div role="status" aria-live="polite" className="rounded-xl border border-[#e7d6ab] bg-[#f4e8c9] px-3.5 py-3 text-ink">
                <p className="font-bold">Check your phone for a text message</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/80">
                  Enter the six-digit code we sent to <strong className="text-paddy-d">{verificationPhone}</strong>. It expires in 10 minutes.
                </p>
              </div>
              <label className={labelClass}>
                6-digit SMS verification code
                <input
                  className={fieldClass}
                  name="verificationCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="Enter code"
                  aria-describedby="verification-code-hint"
                  required
                />
                <span id="verification-code-hint" className="mt-1 block text-sm font-normal text-white/70">
                  Use the six-digit code in the SMS.
                </span>
              </label>
            </>}
            {error && <p role="alert" className="rounded-xl border border-red-200/30 bg-red-950/35 px-3.5 py-3 text-sm font-bold text-red-100">{error}</p>}
            <button className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-husk px-5 font-bold text-ink transition-colors hover:bg-[#f5d98f] disabled:cursor-wait disabled:opacity-70" type="submit" disabled={busy}>
              {busy ? <><span aria-hidden className="auth-spinner h-4 w-4 rounded-full border-2 border-ink/30 border-t-ink" />{busyMessage}</> : registering ? (codeSent ? "Verify and create account" : "Send verification code") : "Sign in"}
            </button>
            {busy && <p role="status" aria-live="polite" className="sr-only">{busyMessage}</p>}
          </form>

          <p className="mt-5 text-center text-sm text-white/70">
            {registering ? "Already registered? " : "New to ALAGARAB? "}
            <Link className="font-bold text-husk underline hover:text-white" href={registering ? "/login" : "/signup"}>{registering ? "Sign in" : "Create an account"}</Link>
          </p>
          {!registering && <details className="mt-6 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 text-sm text-white/75">
            <summary className="cursor-pointer font-bold text-white">Development demo accounts</summary>
            <p className="mt-2">Seeded accounts use PIN <strong className="text-white">1234</strong>. Admin: <strong className="text-white">0917 000 0001</strong>; plant staff: <strong className="text-white">0917 000 0002</strong>. Farmers: 0003, 0004, and 0008–0015; cooperative: 0005; rice buyers: 0006, 0007, and 0016–0023.</p>
          </details>}
        </section>
        <p className="mt-4 text-center text-xs text-white/65">Your account details are stored securely by the ALAGARAB service.</p>
      </div>
    </main>
  );
}

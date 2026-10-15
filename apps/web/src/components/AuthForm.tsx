"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { AccountType, Language } from "@irpc/types";
import { api } from "@/lib/api";
import { authDestination, validateCredentials } from "@/lib/auth";
import { LanguageToggle, useLanguage } from "@/lib/language";
import { Button, Card, TextField, SelectField } from "./ui";

export default function AuthForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>(AccountType.FARMER);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const fields = validateCredentials(phone, pin);
  const title = signup ? t("Create account", "Maghimo sang account") : t("Log in", "Mag-log in");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true); setError(null);
    if (pending.current || !fields.phone || fields.pinError || (signup && (!name.trim() || !consent))) return;
    pending.current = true; setBusy(true);
    try {
      const result = signup
        ? await api.register({ name: name.trim(), phone: fields.phone, pin, accountType, language, consent: true })
        : await api.login(fields.phone, pin);
      setPin("");
      setLanguage(result.user.language);
      router.replace(authDestination(result.user));
    } catch (error) {
      // Preserve the server's message, including lockout duration; never translate it.
      setError(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally { pending.current = false; setBusy(false); }
  }

  return <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-5 px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="min-h-11 py-3 font-bold text-paddy-d">IRPC</Link><LanguageToggle /></div>
    <h1 className="text-3xl font-bold">{title}</h1>
    {api.useMock && <p className="text-sm text-sub">{t("Sample-data mode. Accounts reset when you reload.", "Demo lamang. Madula ang account kon i-reload ang pahina.")}</p>}
    <Card>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate aria-busy={busy}>
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
          {signup && <TextField label={t("Full name", "Bug-os nga ngalan")} autoComplete="name" value={name} onChange={e => setName(e.target.value)}
            error={submitted && !name.trim() ? t("Enter your name.", "Isulat ang imo ngalan.") : undefined} />}
          <TextField label={t("Mobile number", "Numero sang cellphone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567"
            value={phone} onChange={e => setPhone(e.target.value)} error={submitted && fields.phoneError ? t(fields.phoneError, "Isulat ang husto nga numero sang cellphone.") : undefined} />
          <TextField label="PIN" type="password" inputMode="numeric" autoComplete={signup ? "new-password" : "current-password"}
            value={pin} onChange={e => setPin(e.target.value)} hint={t("4 to 6 digits", "4 tubtob 6 ka numero")}
            error={submitted && fields.pinError ? t(fields.pinError, "Ang PIN dapat may 4 tubtob 6 ka numero.") : undefined} />
          {signup && <>
            <SelectField label={t("Account type", "Klase sang account")} value={accountType} onChange={e => setAccountType(e.target.value as AccountType)}>
              <option value={AccountType.FARMER}>{t("Farmer", "Mangunguma")}</option>
              <option value={AccountType.COOPERATIVE}>{t("Cooperative", "Kooperatiba")}</option>
              <option value={AccountType.BUYER}>{t("Buyer", "Manugbakal")}</option>
              <option value={AccountType.INSTITUTION}>{t("Institution", "Institusyon")}</option>
            </SelectField>
            <SelectField label={t("Preferred language", "Ginapili nga lengguwahe")} value={language} onChange={e => setLanguage(e.target.value as Language)}>
              <option value={Language.EN}>English</option><option value={Language.HIL}>Hiligaynon</option>
            </SelectField>
            <label className="flex min-h-12 items-start gap-3 py-2"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>{t("I consent to IRPC using my name and phone number to manage my account, orders, and SMS updates.", "Nagasugot ako nga gamiton sang IRPC ang akon ngalan kag numero para sa akon account, mga order, kag SMS updates.")}</span>
            </label>
            {submitted && !consent && <p className="text-clay" role="alert">{t("Your consent is required to create an account.", "Kinahanglan ang imo pagtugot sa paghimo sang account.")}</p>}
          </>}
          {error && <p className="whitespace-pre-wrap text-clay" role="alert">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? t("Please wait…", "Palihog hulat…") : title}</Button>
        </fieldset>
      </form>
    </Card>
    <Link className="min-h-12 py-3 font-bold text-paddy-d underline" href={signup ? "/login" : "/signup"}>
      {signup ? t("Already have an account? Log in", "May account ka na? Mag-log in") : t("New here? Create an account", "Bag-o ka diri? Maghimo sang account")}
    </Link>
  </main>;
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccountType, Language, Role, normalizePhPhone } from '@irpc/types';
import { api, ApiError, setAuthToken } from '@/lib/api';

type Portal = 'farmer' | 'buyer' | 'staff';
type Mode = 'login' | 'signup';

const details = {
  farmer: { label: 'Farmer', description: 'Track palay sales, service requests, and order updates.' },
  buyer: { label: 'Buyer', description: 'Review available rice and follow your active orders.' },
  staff: { label: 'IRPC staff', description: 'Use the account assigned to you by an IRPC administrator.' },
} satisfies Record<Portal, { label: string; description: string }>;

export default function AuthForm({ initialPortal, initialMode }: { initialPortal: Portal; initialMode: Mode }) {
  const router = useRouter();
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [mode, setMode] = useState<Mode>(initialPortal === 'staff' ? 'login' : initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [town, setTown] = useState('');
  const [language, setLanguage] = useState<Language>(Language.HIL);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = details[portal];

  function choosePortal(next: Portal) {
    setPortal(next);
    if (next === 'staff') setMode('login');
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizePhPhone(phone);
    if (!normalized) return setError('Enter a Philippine mobile number, e.g. 0917 123 4567.');
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN must be 4 to 6 digits.');

    if (mode === 'signup') {
      if (name.trim().length < 2) return setError('Enter your full name.');
      if (pin !== confirmPin) return setError('The PINs do not match.');
      if (!town.trim()) return setError('Enter your town or municipality.');
      if (!consent) return setError('You must agree to the data privacy notice to register.');
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await api.register({
          name: name.trim(),
          phone: normalized,
          pin,
          accountType: portal === 'farmer' ? AccountType.FARMER : AccountType.BUYER,
          language,
          municipality: town.trim(),
          consent: true,
        });
        router.replace('/buyer');
        return;
      }

      const result = await api.login(normalized, pin);
      const user = result.user as { role?: Role; accountType?: AccountType | null };
      const isStaff = user.role === Role.ADMIN || user.role === Role.PLANT_STAFF || user.role === Role.MAO_STAFF;
      const matches = portal === 'staff'
        ? isStaff
        : user.role === Role.USER && user.accountType === (portal === 'farmer' ? AccountType.FARMER : AccountType.BUYER);
      if (!matches) {
        setAuthToken(null);
        return setError(`This account does not have ${copy.label.toLowerCase()} access.`);
      }
      router.replace(portal === 'staff' ? '/staff' : '/buyer');
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 429
        ? 'Too many tries, wait 5 minutes.'
        : cause instanceof Error ? cause.message : mode === 'login'
          ? 'Sign in could not be completed.' : 'Your account could not be created.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-8 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-pop lg:grid-cols-[0.85fr_1.15fr]">
        <section className="flex flex-col justify-between gap-10 bg-ink p-7 text-white sm:p-10">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-husk text-ink">IR</span>IRPC Digital Platform</Link>
            <p className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-husk">{copy.label}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="mt-4 max-w-md text-white/70">{copy.description}</p>
          </div>
          <p className="text-sm text-white/55">Your account is stored by the IRPC API in PostgreSQL. Your PIN is sent securely to the API and stored only as a hash.</p>
        </section>

        <section className="p-7 sm:p-10">
          <div className="mb-5 flex flex-wrap gap-2" aria-label="Choose account type">
            {(['farmer', 'buyer', 'staff'] as const).map((item) => (
              <button key={item} type="button" onClick={() => choosePortal(item)} aria-pressed={portal === item}
                className={`rounded-full px-4 py-2 text-sm font-bold ${portal === item ? 'bg-paddy-d text-white' : 'bg-mist text-sub hover:text-ink'}`}>
                {details[item].label}
              </button>
            ))}
          </div>

          {portal !== 'staff' && (
            <div className="mb-7 grid grid-cols-2 rounded-xl bg-mist p-1" aria-label="Sign in or sign up">
              {(['login', 'signup'] as const).map((item) => (
                <button key={item} type="button" onClick={() => { setMode(item); setError(null); }} aria-pressed={mode === item}
                  className={`min-h-10 rounded-lg px-4 text-sm font-bold ${mode === item ? 'bg-white text-ink shadow-sm' : 'text-sub'}`}>
                  {item === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            {mode === 'signup' && (
              <label className="flex flex-col gap-1.5 text-sm font-bold sm:col-span-2">Full name
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} className="min-h-12 rounded-xl border border-line px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10" required />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-bold sm:col-span-2">Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" className="min-h-12 rounded-xl border border-line px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10" required />
            </label>
            <label className={`flex flex-col gap-1.5 text-sm font-bold ${mode === 'login' ? 'sm:col-span-2' : ''}`}>{mode === 'login' ? 'PIN' : 'Create PIN'}
              <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={4} maxLength={6} placeholder="4 to 6 digits" className="min-h-12 rounded-xl border border-line px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10" required />
            </label>
            {mode === 'signup' && <>
              <label className="flex flex-col gap-1.5 text-sm font-bold">Confirm PIN
                <input value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} type="password" inputMode="numeric" autoComplete="new-password" minLength={4} maxLength={6} className="min-h-12 rounded-xl border border-line px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10" required />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">Town or municipality
                <input value={town} onChange={(event) => setTown(event.target.value)} autoComplete="address-level2" maxLength={100} className="min-h-12 rounded-xl border border-line px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10" required />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">Preferred language
                <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="min-h-12 rounded-xl border border-line bg-white px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10">
                  <option value={Language.HIL}>Hiligaynon</option>
                  <option value={Language.EN}>English</option>
                </select>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-line bg-mist/60 p-4 text-sm sm:col-span-2">
                <input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-paddy-d" />
                <span>I agree that IRPC may store my account details and use my phone number for order and service updates.</span>
              </label>
            </>}
            {error && <p role="alert" className="rounded-xl border border-clay/25 bg-clay-l p-3 text-sm font-bold text-clay sm:col-span-2">{error}</p>}
            <button disabled={busy} className="min-h-12 rounded-xl bg-paddy-d px-5 font-bold text-white hover:bg-paddy disabled:opacity-50 sm:col-span-2">
              {busy ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>
          </form>
          {portal === 'staff' && <p className="mt-6 text-sm text-sub">IRPC staff accounts are created by an administrator. Contact your supervisor if you need access.</p>}
        </section>
      </div>
    </main>
  );
}

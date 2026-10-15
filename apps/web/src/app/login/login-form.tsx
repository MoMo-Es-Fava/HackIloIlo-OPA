'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccountType, Role, normalizePhPhone } from '@irpc/types';
import { api, ApiError, setAuthToken } from '@/lib/api';

type Portal = 'farmer' | 'buyer' | 'staff';
const details = {
  farmer: { label: 'Farmer', title: 'Welcome back', description: 'Track palay sales, service requests, and order updates.' },
  buyer: { label: 'Buyer', title: 'Sign in to buy rice', description: 'Review available rice and follow your active orders.' },
  staff: { label: 'IRPC staff', title: 'Open the staff workspace', description: 'Use the account assigned to you by an IRPC administrator.' },
} satisfies Record<Portal, { label: string; title: string; description: string }>;

export default function LoginForm({ portal }: { portal: Portal }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = details[portal];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizePhPhone(phone);
    if (!normalized) return setError('Enter a Philippine mobile number, e.g. 0917 123 4567.');
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN must be 4 to 6 digits.');
    setBusy(true);
    setError(null);
    try {
      const result = await api.login(normalized, pin);
      const user = result.user as { role?: Role; accountType?: AccountType | null };
      const isStaff = user.role === Role.ADMIN || user.role === Role.PLANT_STAFF || user.role === Role.MAO_STAFF;
      const matches = api.useMock || (portal === 'staff'
        ? isStaff
        : user.role === Role.USER && user.accountType === (portal === 'farmer' ? AccountType.FARMER : AccountType.BUYER));
      if (!matches) {
        setAuthToken(null);
        return setError(`This account does not have ${copy.label.toLowerCase()} access.`);
      }
      router.replace(portal === 'staff' ? '/staff' : '/buyer');
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 429
        ? 'Too many tries, wait 5 minutes.'
        : cause instanceof Error ? cause.message : 'Sign in could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-8 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-pop lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between gap-10 bg-ink p-7 text-white sm:p-10">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-husk text-ink">IR</span>IRPC Digital Platform</Link>
            <p className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-husk">{copy.label}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-4 max-w-md text-white/70">{copy.description}</p>
          </div>
          <p className="text-sm text-white/55">Your PIN is sent only to the IRPC API and is never stored in the browser.</p>
        </section>
        <section className="p-7 sm:p-10">
          <div className="mb-7 flex flex-wrap gap-2" aria-label="Choose account type">
            {(['farmer', 'buyer', 'staff'] as const).map((item) => (
              <Link key={item} href={`/login?account=${item}`} aria-current={portal === item ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-sm font-bold ${portal === item ? 'bg-paddy-d text-white' : 'bg-mist text-sub hover:text-ink'}`}>
                {details[item].label}
              </Link>
            ))}
          </div>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm font-bold">Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567"
                className="min-h-12 rounded-xl border border-line px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">PIN
              <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="current-password"
                minLength={4} maxLength={6} placeholder="4 to 6 digits" className="min-h-12 rounded-xl border border-line px-3.5 font-normal focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/10" required />
            </label>
            {error && <p role="alert" className="rounded-xl border border-clay/25 bg-clay-l p-3 text-sm font-bold text-clay">{error}</p>}
            <button disabled={busy} className="min-h-12 rounded-xl bg-paddy-d px-5 font-bold text-white hover:bg-paddy disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {portal === 'staff' ? (
            <p className="mt-6 text-sm text-sub">IRPC accounts are created by an administrator. Contact your supervisor if you need access.</p>
          ) : (
            <p className="mt-6 text-sm text-sub">New {portal}? <Link className="font-bold text-paddy-d underline" href={`/signup?account=${portal}`}>Create an account</Link></p>
          )}
          {api.useMock && <p className="mt-3 text-xs text-sub">Demo login: +639170000007 with PIN 1234.</p>}
        </section>
      </div>
    </main>
  );
}

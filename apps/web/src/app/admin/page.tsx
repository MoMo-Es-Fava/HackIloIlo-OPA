"use client";

import { AccountType, Language, Role } from "@irpc/types";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type ManagedUser } from "@/lib/api";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-paddy focus:ring-2 focus:ring-paddy/15";
const labelClass = "block text-sm font-semibold text-ink";
const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-lg bg-paddy px-4 text-sm font-bold text-white transition-colors hover:bg-paddy-d disabled:cursor-wait disabled:opacity-60";
const roles = [Role.USER, Role.PLANT_STAFF, Role.MAO_STAFF, Role.ADMIN];
const accountTypes = [AccountType.FARMER, AccountType.COOPERATIVE, AccountType.BUYER, AccountType.INSTITUTION];

type Form = { name: string; phone: string; pin: string; role: Role; accountType: AccountType | ""; language: Language; municipality: string; cooperative: string };
const emptyForm = (): Form => ({ name: "", phone: "", pin: "", role: Role.USER, accountType: AccountType.FARMER, language: Language.HIL, municipality: "", cooperative: "" });
const roleName = (role: Role) => role === Role.USER ? "Community user" : role.replaceAll("_", " ");

export default function AdminDashboard() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try { setUsers(await api.adminListUsers()); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Could not load user accounts."); }
  }, []);
  useEffect(() => { void loadUsers(); }, [loadUsers]);

  function edit(user: ManagedUser) {
    setSelected(user.id);
    setForm({ name: user.name, phone: user.phone, pin: "", role: user.role, accountType: user.accountType ?? "", language: user.language, municipality: user.municipality ?? "", cooperative: user.cooperative ?? "" });
    setError(null); setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() { setSelected(null); setForm(emptyForm()); setError(null); setNotice(null); }
  function updateField<K extends keyof Form>(key: K, value: Form[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    if ((form.role === Role.USER) !== Boolean(form.accountType)) {
      setError("Choose a farmer or buyer account type for community users. Staff and admin accounts do not use one.");
      setBusy(false); return;
    }
    try {
      const payload = {
        name: form.name.trim(), phone: form.phone.trim(), role: form.role,
        accountType: form.role === Role.USER ? form.accountType as AccountType : null,
        language: form.language, municipality: form.municipality.trim() || null,
        cooperative: form.cooperative.trim() || null,
        ...(form.pin ? { pin: form.pin } : {}),
      };
      if (selected === null) {
        if (!form.pin) throw new Error("Set a 4 to 6 digit PIN for the new user.");
        await api.adminCreateUser({ ...payload, pin: form.pin });
        setNotice("User account created.");
      } else {
        await api.adminUpdateUser(selected, payload);
        setNotice("User account updated.");
      }
      setSelected(null); setForm(emptyForm());
      await loadUsers();
    } catch (cause) { setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Could not save this account."); }
    finally { setBusy(false); }
  }

  async function toggleActive(user: ManagedUser) {
    setError(null); setNotice(null);
    try {
      await api.adminUpdateUser(user.id, { isActive: !user.isActive });
      setNotice(`${user.name} ${user.isActive ? "deactivated" : "reactivated"}.`);
      await loadUsers();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Could not update this account."); }
  }

  return (
    <div>
      <div className="border-b border-line pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-paddy-d">IRPC administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">User accounts</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">Create and maintain farmer, buyer, plant staff, and admin access. New accounts can sign in with the phone number and PIN you set.</p>
      </div>

      {(error || notice) && <p role={error ? "alert" : "status"} className={`mt-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-900"}`}>{error ?? notice}</p>}

      <section className="mt-7 border-b border-line pb-8" aria-labelledby="user-form-heading">
        <div className="flex items-center justify-between gap-4">
          <div><h2 id="user-form-heading" className="text-lg font-bold">{selected === null ? "Create a user" : `Edit ${form.name}`}</h2><p className="mt-1 text-sm text-sub">{selected === null ? "Enter the user’s account details and initial PIN." : "Leave the PIN blank to keep the current one."}</p></div>
          {selected !== null && <button type="button" onClick={reset} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-sub hover:bg-white">Cancel edit</button>}
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>Full name<input className={inputClass} value={form.name} onChange={(e) => updateField("name", e.target.value)} minLength={2} maxLength={100} required /></label>
          <label className={labelClass}>Phone number<input className={inputClass} type="tel" inputMode="tel" placeholder="0917 123 4567" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} pattern="(?:\+?63|0)9[0-9]{9}" required /></label>
          <label className={labelClass}>{selected === null ? "Initial PIN" : "New PIN (optional)"}<input className={inputClass} type="password" inputMode="numeric" autoComplete="new-password" value={form.pin} onChange={(e) => updateField("pin", e.target.value)} minLength={selected === null || form.pin ? 4 : undefined} maxLength={6} pattern={form.pin || selected === null ? "[0-9]{4,6}" : undefined} required={selected === null} placeholder={selected === null ? "4 to 6 digits" : "Leave blank to keep current PIN"} /></label>
          <label className={labelClass}>Role<select className={inputClass} value={form.role} onChange={(e) => { const role = e.target.value as Role; updateField("role", role); if (role !== Role.USER) updateField("accountType", ""); else if (!form.accountType) updateField("accountType", AccountType.FARMER); }}>{roles.map((role) => <option key={role} value={role}>{roleName(role)}</option>)}</select></label>
          <label className={labelClass}>Account type<select className={inputClass} value={form.accountType} disabled={form.role !== Role.USER} onChange={(e) => updateField("accountType", e.target.value as Form["accountType"])}><option value="">Not applicable</option>{accountTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className={labelClass}>Language<select className={inputClass} value={form.language} onChange={(e) => updateField("language", e.target.value as Language)}><option value={Language.HIL}>Hiligaynon</option><option value={Language.EN}>English</option></select></label>
          <label className={labelClass}>Municipality<input className={inputClass} value={form.municipality} onChange={(e) => updateField("municipality", e.target.value)} maxLength={100} /></label>
          <label className={labelClass}>Cooperative<input className={inputClass} value={form.cooperative} onChange={(e) => updateField("cooperative", e.target.value)} maxLength={100} /></label>
          <div className="flex items-end gap-3"><button type="submit" className={buttonClass} disabled={busy}>{busy ? "Saving…" : selected === null ? "Create user" : "Save changes"}</button>{selected !== null && <button type="button" className="min-h-10 rounded-lg px-3 text-sm font-semibold text-sub hover:bg-white" onClick={() => void toggleActive(users.find((user) => user.id === selected)!)}>{users.find((user) => user.id === selected)?.isActive ? "Deactivate" : "Reactivate"}</button>}</div>
        </form>
      </section>

      <section className="mt-7" aria-labelledby="user-list-heading">
        <div className="flex items-baseline justify-between gap-4"><h2 id="user-list-heading" className="text-lg font-bold">All users</h2><span className="text-sm text-sub">{users.length} accounts</span></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#f1f3ef] text-xs uppercase tracking-wide text-sub"><tr><th className="px-4 py-3">Name / phone</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Account type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-line">{users.map((user) => <tr key={user.id} className="align-middle"><td className="px-4 py-3"><div className="font-semibold">{user.name}</div><div className="mt-0.5 text-xs text-sub">{user.phone}</div></td><td className="px-4 py-3">{roleName(user.role)}</td><td className="px-4 py-3">{user.accountType ?? "—"}</td><td className="px-4 py-3"><span className={user.isActive ? "text-green-800" : "text-sub"}>{user.isActive ? "Active" : "Inactive"}</span></td><td className="px-4 py-3 text-sub">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-4 py-3"><button type="button" onClick={() => edit(user)} className="min-h-9 rounded-md px-3 font-bold text-paddy-d hover:bg-mist">Edit</button><button type="button" onClick={() => void toggleActive(user)} className="min-h-9 rounded-md px-3 font-semibold text-sub hover:bg-mist">{user.isActive ? "Deactivate" : "Reactivate"}</button></td></tr>)}
            {!users.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sub">No users found.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useStore } from "@/lib/store";
import { useId } from "react";
import type { BookingStatus, Stage } from "@/lib/demo-types";
import { OrderStatus } from "@irpc/types";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "ghost" | "danger";
export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const { busy } = useStore();
  const v = {
    primary: "bg-paddy-d text-white shadow-sm hover:bg-paddy",
    ghost: "border border-paddy-d bg-white text-paddy-d hover:bg-mist",
    danger: "border border-clay bg-white text-clay hover:bg-clay-l",
  }[variant];
  return (
    <button
      type="button"
      {...p}
      disabled={busy || p.disabled}
      className={cn("inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50", v, className)}
    />
  );
}

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
const toneCls: Record<Tone, string> = {
  ok: "bg-paddy-d text-white",
  warn: "bg-husk text-ink",
  bad: "bg-clay text-white",
  info: "bg-sky-d text-white",
  neutral: "border border-line bg-mist text-ink",
};
const toneIcon: Record<Tone, string> = { ok: "✓", warn: "!", bad: "✕", info: "i", neutral: "•" };

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-sm font-bold", toneCls[tone])}>
      <span aria-hidden>{toneIcon[tone]}</span>
      {children}
    </span>
  );
}

export const orderTone = (s: OrderStatus): Tone => {
  if (s === OrderStatus.REJECTED || s === OrderStatus.CANCELLED) return "bad";
  if (s === OrderStatus.COMPLETED || s === OrderStatus.PAID) return "ok";
  return s === OrderStatus.PENDING ? "warn" : "info";
};
export const stageTone = (s: Stage): Tone => (s === "Sold" ? "ok" : s === "Stored" ? "info" : s === "Received" || s === "Weighed" ? "neutral" : "warn");
export const bookingTone = (s: BookingStatus): Tone => ({ Confirmed: "info", "Checked in": "warn", Done: "ok", "No show": "bad" }[s] as Tone);

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-[0_2px_8px_rgba(23,38,31,0.035)] sm:p-6", className)}>{children}</div>;
}

export function Stat({ label, value, hint, loss }: { label: string; value: string; hint?: string; loss?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl border p-4 sm:p-5", loss ? "border-2 border-clay bg-clay-l" : "border-line bg-white")}>
      <p className="text-sm text-sub">{label}</p>
      <p className={cn("text-2xl font-bold", loss && "text-clay")}>{value}</p>
      {hint && <p className="text-sm text-sub">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, sub, actions, level = 1 }: { title: string; sub?: string; actions?: ReactNode; level?: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex max-w-2xl flex-col gap-1">
        <Heading className="text-2xl font-bold">{title}</Heading>
        {sub && <p className="text-sub">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

const inputCls = "min-h-12 w-full rounded-xl border border-line bg-white px-3 text-base transition-colors hover:border-sub focus:border-paddy-d focus:outline-none focus:ring-2 focus:ring-paddy-d/15";

export function TextField({ label, hint, error, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-bold">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={`${id}-d`} {...p} className={cn(inputCls, error && "border-clay")} />
      <p id={`${id}-d`} className={cn("text-sm", error ? "font-bold text-clay" : "text-sub")}>{error ?? hint}</p>
    </div>
  );
}

export function SelectField({ label, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-bold">{label}</label>
      <select id={id} {...p} className={cn(inputCls, "pr-9")}>{children}</select>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border-2 border-dashed border-line p-6 text-center text-sub">{children}</div>;
}

export const th = "border-b border-line bg-mist px-3 py-3 text-left text-sm font-bold";
export const td = "border-b border-line px-3 py-3 align-top";
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-[0_2px_8px_rgba(23,38,31,0.035)]"><table className="w-full min-w-[640px] border-collapse">{children}</table></div>;
}

export function Bar({ pct, tone = "ok", label }: { pct: number; tone?: "ok" | "bad" | "idle"; label: string }) {
  const color = tone === "bad" ? "bg-clay" : tone === "idle" ? "bg-sub" : "bg-paddy";
  return (
    <div role="img" aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-line">
      <div className={cn("h-full", color)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

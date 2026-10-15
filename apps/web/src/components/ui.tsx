"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";
import type { BookingStatus, OrderStatus, Stage } from "@/lib/data";
import { IconArrowRight, IconCheck, IconAlert, IconClock } from "./icons";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ── Button ───────────────────────────────────────────────────── */
type BtnVariant = "primary" | "ghost" | "danger";
type BtnSize = "md" | "lg";
export function Button({
  variant = "primary",
  size = "md",
  arrow,
  className,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; arrow?: boolean }) {
  const v: Record<BtnVariant, string> = {
    primary:
      "bg-paddy-d text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_16px_-8px_rgba(32,76,54,0.7)] hover:bg-paddy active:bg-paddy-d",
    ghost: "border border-line bg-white text-ink hover:border-paddy/50 hover:bg-mist",
    danger: "border border-clay/40 bg-clay-l text-clay hover:bg-clay hover:text-white hover:border-clay",
  };
  const s: Record<BtnSize, string> = {
    md: "min-h-12 px-5 text-[15px]",
    lg: "min-h-13 px-6 text-base",
  };
  return (
    <button
      type="button"
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-tight",
        "transition-[background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:translate-y-0",
        s[size],
        v[variant],
        className,
      )}
    >
      {children}
      {arrow && <IconArrowRight className="h-[18px] w-[18px]" />}
    </button>
  );
}

/* ── Badge ────────────────────────────────────────────────────── */
export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
const toneCls: Record<Tone, string> = {
  ok: "border-paddy/25 bg-paddy/10 text-paddy-d",
  warn: "border-husk/60 bg-husk/20 text-[#7a5a10]",
  bad: "border-clay/25 bg-clay/10 text-clay",
  info: "border-sky-d/20 bg-sky-d/10 text-sky-d",
  neutral: "border-line bg-mist text-sub",
};
const dotCls: Record<Tone, string> = {
  ok: "bg-paddy-d",
  warn: "bg-[#c79a2e]",
  bad: "bg-clay",
  info: "bg-sky-d",
  neutral: "bg-sub/60",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-bold leading-tight",
        toneCls[tone],
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotCls[tone])} />
      {children}
    </span>
  );
}

export const orderTone = (s: OrderStatus): Tone =>
  ({ Reserved: "warn", Paid: "info", Ready: "info", Delivered: "ok", Cancelled: "bad" }[s] as Tone);
export const stageTone = (s: Stage): Tone =>
  s === "Sold" ? "ok" : s === "Stored" ? "info" : s === "Received" || s === "Weighed" ? "neutral" : "warn";
export const bookingTone = (s: BookingStatus): Tone =>
  ({ Confirmed: "info", "Checked in": "warn", Done: "ok", "No show": "bad" }[s] as Tone);

/* ── Card ─────────────────────────────────────────────────────── */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-line/80 bg-white p-5 shadow-card sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Stat ─────────────────────────────────────────────────────── */
export function Stat({
  label,
  value,
  hint,
  loss,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  loss?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 overflow-hidden rounded-2xl border p-4 transition-shadow sm:p-5",
        loss ? "border-clay/40 bg-clay-l" : "border-line/80 bg-white shadow-card hover:shadow-raised",
      )}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg", loss ? "bg-clay/15 text-clay" : "bg-mist text-paddy-d")}>
            {icon}
          </span>
        )}
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-sub">{label}</p>
      </div>
      <p className={cn("tnum text-[26px] font-bold leading-tight tracking-tight", loss && "text-clay")}>{value}</p>
      {hint && <p className="text-[13px] leading-snug text-sub">{hint}</p>}
    </div>
  );
}

/* ── PageHeader ───────────────────────────────────────────────── */
export function PageHeader({
  title,
  sub,
  actions,
  eyebrow,
  icon,
  level = 1,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="flex max-w-2xl items-start gap-3">
        {icon && level === 1 && (
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paddy-d/8 text-paddy-d">
            {icon}
          </span>
        )}
        <div className="flex flex-col gap-1">
          {eyebrow && <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-paddy-d/70">{eyebrow}</p>}
          <Heading
            className={cn(
              "font-bold tracking-tight",
              level === 1 ? "text-[28px] leading-tight sm:text-[32px]" : "text-xl",
            )}
          >
            {title}
          </Heading>
          {sub && <p className="text-sub">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 pb-1">{actions}</div>}
    </div>
  );
}

/* ── Fields ───────────────────────────────────────────────────── */
const inputCls =
  "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink transition-[border-color,box-shadow] placeholder:text-sub/60 hover:border-sub/50 focus:border-paddy-d focus:outline-none focus:ring-4 focus:ring-paddy-d/12";

export function TextField({
  label,
  hint,
  error,
  className,
  ...p
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={`${id}-d`}
        {...p}
        className={cn(inputCls, error && "border-clay focus:border-clay focus:ring-clay/15", className)}
      />
      {(error || hint) && (
        <p id={`${id}-d`} className={cn("flex items-center gap-1.5 text-[13px]", error ? "font-bold text-clay" : "text-sub")}>
          {error && <IconAlert className="h-4 w-4 shrink-0" />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...p
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-ink">
        {label}
      </label>
      <div className="relative">
        <select id={id} {...p} className={cn(inputCls, "appearance-none pr-10", className)}>
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

/* ── Empty ────────────────────────────────────────────────────── */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/50 px-6 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-mist text-sub">
        <IconClock className="h-5 w-5" />
      </span>
      <p className="max-w-sm text-[15px] text-sub">{children}</p>
    </div>
  );
}

/* ── Notice (soft inline callout) ─────────────────────────────── */
export function Notice({ tone = "info", children }: { tone?: "ok" | "info" | "warn"; children: ReactNode }) {
  const map = {
    ok: { box: "border-paddy/30 bg-paddy/[0.07]", icon: "bg-paddy-d text-white", I: IconCheck },
    info: { box: "border-sky-d/25 bg-sky-l/70", icon: "bg-sky-d text-white", I: IconClock },
    warn: { box: "border-husk/60 bg-husk/15", icon: "bg-[#c79a2e] text-white", I: IconAlert },
  }[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", map.box)}>
      <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", map.icon)}>
        <map.I className="h-[15px] w-[15px]" />
      </span>
      <div className="text-[15px]">{children}</div>
    </div>
  );
}

/* ── Table ────────────────────────────────────────────────────── */
export const th =
  "border-b border-line bg-mist/70 px-4 py-3 text-left text-[12px] font-bold uppercase tracking-[0.06em] text-sub";
export const td = "border-b border-line/70 px-4 py-3.5 align-middle text-[15px]";
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">{children}</table>
      </div>
    </div>
  );
}

/* ── Bar ──────────────────────────────────────────────────────── */
export function Bar({ pct, tone = "ok", label }: { pct: number; tone?: "ok" | "bad" | "idle"; label: string }) {
  const color = tone === "bad" ? "bg-clay" : tone === "idle" ? "bg-sub/55" : "bg-paddy";
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div role="img" aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-line/70">
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", color)} style={{ width: `${w}%` }} />
    </div>
  );
}

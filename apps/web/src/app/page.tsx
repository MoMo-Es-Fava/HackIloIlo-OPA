import Link from "next/link";
import Image from "next/image";
import { IconBag, IconWrench, IconArrowRight, IconTrace, IconLeaf, IconBolt } from "@/components/icons";
import { imageCredits } from "@/lib/credits";

const portals = [
  {
    href: "/buyer",
    icon: IconBag,
    eyebrow: "For rice buyers",
    title: "Buy rice and track orders",
    description: "Browse IRPC rice, compare available stock and prices, and follow your order from reservation to delivery.",
    action: "Open buyer portal",
    btn: "bg-husk text-ink hover:bg-[#f5d98f]",
    detail: "Offers · orders · prices · batch traceability",
  },
  {
    href: "/staff",
    icon: IconWrench,
    eyebrow: "For IRPC staff",
    title: "Run today's operations",
    description: "Coordinate arrivals, record weights, move batches through processing, and manage sales and prices.",
    action: "Open staff workspace",
    btn: "bg-white text-paddy-d hover:bg-mist",
    detail: "Queue · intake · processing · sales",
  },
];

const pillars = [
  { icon: IconTrace, label: "Traceable", detail: "Farm to mill to buyer" },
  { icon: IconBolt, label: "Real-time", detail: "Costing, queue, and energy" },
  { icon: IconLeaf, label: "Local", detail: "Iloilo's rice complex" },
];

export default function Landing() {
  const hero = imageCredits[0];

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-ink">
      {/* ── Cinematic hero photograph ─────────────────────────────── */}
      <div className="absolute inset-0">
        <Image
          src="/images/nagacadan-farmers.jpg"
          alt="Filipino farmers planting rice on the stonewalled Nagacadan Rice Terraces in Kiangan, Ifugao"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Layered scrims: readability + brand warmth + depth */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-ink/92 via-ink/72 to-paddy-d/55" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/45" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_10%,transparent_35%,rgba(9,20,14,0.55)_100%)]" />
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-husk font-bold text-ink shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">IR</span>
            <span className="flex flex-col leading-tight text-white">
              <span className="font-bold tracking-wide">IRPC</span>
              <span className="text-xs text-white/65">Rice marketplace</span>
            </span>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white/90 backdrop-blur-md sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-husk" aria-hidden />
            Iloilo rice processing complex
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-husk/30 bg-husk/10 px-3.5 py-1.5 text-[13px] font-bold text-husk backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-husk" aria-hidden />
              Digital platform for the Iloilo rice complex
            </p>
            <h1 className="text-[2.6rem] font-bold leading-[1.04] tracking-tight text-white sm:text-6xl">
              Good rice starts with a{" "}
              <span className="relative inline-block">
                <span className="relative z-10">better connection.</span>
                <span aria-hidden className="absolute -bottom-1 left-0 h-[7px] w-full rounded-full bg-husk/70" />
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
              One place to find IRPC rice, follow every batch, and keep plant operations moving.
              Choose the workspace that fits what you need to do.
            </p>

            <section className="mt-9 grid gap-4 sm:grid-cols-2" aria-label="Choose a workspace">
              {portals.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="group relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.06] p-6 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.1] sm:p-7"
                >
                  <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-husk/10 blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
                  <div className="relative flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-husk ring-1 ring-inset ring-white/15">
                        <portal.icon className="h-6 w-6" />
                      </span>
                      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/70">{portal.eyebrow}</p>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">{portal.title}</h2>
                    <p className="max-w-md text-[15px] leading-relaxed text-white/75">{portal.description}</p>
                  </div>
                  <div className="relative flex flex-col gap-4">
                    <span className="text-sm text-white/55">{portal.detail}</span>
                    <span className={`inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl px-5 font-bold shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)] transition-all group-hover:gap-3 ${portal.btn}`}>
                      {portal.action}
                      <IconArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-md">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-husk/15 text-husk ring-1 ring-inset ring-husk/20">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-bold text-white">{p.label}</span>
                  <span className="text-[13px] text-white/60">{p.detail}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 pt-5 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-white/80">
                i
              </span>
              Demo workspace: sample records are shared between portals and reset when you reload. No sign-in or real transactions.
            </p>
            <p className="shrink-0">
              Hero photo: {hero.title} — {hero.author},{" "}
              <a href={hero.licenseUrl} target="_blank" rel="noreferrer" className="font-bold text-white/70 underline hover:text-white">
                {hero.license}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

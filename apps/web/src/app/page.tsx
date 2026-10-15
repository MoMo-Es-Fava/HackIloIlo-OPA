import Link from "next/link";
import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import { IconBag, IconWrench, IconArrowRight, IconTrace, IconLeaf, IconBolt } from "@/components/icons";
import { imageCredits } from "@/lib/credits";

const portals = [
  {
    href: "/login?next=%2Fbuyer",
    icon: IconBag,
    eyebrow: "For rice buyers and farmers",
    title: "Buy rice or sell palay",
    description: "Buyers can browse ALAGARAB rice, compare prices, and track orders. Farmers can offer palay for sale and follow its progress.",
    action: "Open buyer / farmer portal",
    btn: "bg-husk text-ink hover:bg-[#f5d98f]",
    detail: "Rice offers · palay sales · orders · prices · batch traceability",
  },
  {
    href: "/login?next=%2Fstaff",
    icon: IconWrench,
    eyebrow: "For ALAGARAB staff",
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
          <Link href="/" aria-label="ALAGARAB home" className="brand-link brand-logo-link flex items-center gap-3 rounded-lg">
            <BrandLogo size={44} />
            <span
              className="font-bold leading-6 tracking-wide text-white"
            >
              ALAGARAB
            </span>
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center py-14 sm:py-20">
          <div className="w-full">
            <div className="max-w-3xl">
              <h1 className="text-[2.6rem] font-bold leading-[1.04] tracking-tight text-white sm:text-6xl">
                Good rice starts with a{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">better connection.</span>
                  <span aria-hidden className="absolute -bottom-1 left-0 h-[7px] w-full rounded-full bg-husk/70" />
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
                One place to find ALAGARAB rice, follow every batch, and keep plant operations moving.
                Choose the workspace that fits what you need to do.
              </p>
            </div>

            <section className="portal-grid mt-9 w-full" aria-label="Choose a workspace">
              {portals.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="portal-card group relative rounded-3xl border border-white/12 bg-white/[0.06] p-6 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-[border-color,background-color,transform] duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.1] sm:p-7"
                >
                  <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-husk/10 blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
                  <div className="portal-card__main relative flex min-w-0 flex-col justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-husk ring-1 ring-inset ring-white/15">
                          <portal.icon className="h-6 w-6" />
                        </span>
                        <p className="text-[24px] font-bold uppercase tracking-[0.16em] text-white/70">{portal.eyebrow}</p>
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-white">{portal.title}</h2>
                    </div>
                    <span className={`inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl px-5 font-bold shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)] transition-all group-hover:gap-3 ${portal.btn}`}>
                      {portal.action}
                      <IconArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <div className="portal-card__description relative flex min-w-0 flex-col justify-center gap-4">
                    <p className="text-[15px] leading-relaxed text-white/85">{portal.description}</p>
                    <span className="text-sm leading-relaxed text-white/70">{portal.detail}</span>
                  </div>
                </Link>
              ))}
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.label} className="flex items-center gap-3 px-2 py-2">
                <span className="shrink-0 text-husk">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-bold text-white">{p.label}</span>
                  <span className="text-[13px] text-white/60">{p.detail}</span>
                </span>
              </div>
            ))}
          </div>

          <footer className="flex flex-col items-start gap-3 border-t border-white/10 pt-5 text-[13px] leading-relaxed text-white/65">
            <p className="flex max-w-3xl items-start gap-2">
              <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-white/80">
                i
              </span>
              Sign in with your phone and PIN. SMS verification is being added later; prices and rice offers can be browsed without an account.
            </p>
            <p className="max-w-full">
              Hero photo: {hero.title} — {hero.author},{" "}
              <a href={hero.licenseUrl} target="_blank" rel="noreferrer" className="font-bold text-white/70 underline hover:text-white">
                {hero.license}
              </a>
            </p>
            <Link href="/login?next=%2Fadmin" className="text-xs text-white/45 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/80 hover:decoration-white/60">
              Admin access
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

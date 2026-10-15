import type { PricePoint } from "@/lib/demo-types";

export default function PriceChart({ data }: { data: PricePoint[] }) {
  const max = Math.max(...data.flatMap((d) => [d.fresh, d.dry]), 1);
  const ticks = [max, Math.round(max / 2)];
  return (
    <div>
      <div className="relative flex gap-3 pl-9">
        {/* Gridlines + y-axis labels */}
        <div aria-hidden className="absolute inset-y-0 left-0 w-9">
          {ticks.map((t, i) => (
            <span key={t} className={`absolute right-1 -translate-y-1/2 text-[13px] text-sub ${i === 0 ? "top-0" : "top-1/2"}`}>
              ₱{t}
            </span>
          ))}
        </div>
        <div className="flex h-44 flex-1 items-end gap-3" role="img" aria-label="Weekly fresh and dry prices per kilo">
          {data.map((d) => (
            <div key={d.week} className="flex h-full flex-1 flex-col justify-end gap-1.5">
              <div className="flex flex-1 items-end gap-1">
                <div className="group relative flex-1 rounded-t-md bg-husk/85 transition-all hover:bg-husk" style={{ height: `${(d.fresh / max) * 100}%`, minHeight: 4 }} title={`Fresh ₱${d.fresh}`} />
                <div className="group relative flex-1 rounded-t-md bg-paddy-d transition-all hover:bg-paddy" style={{ height: `${(d.dry / max) * 100}%`, minHeight: 4 }} title={`Dry ₱${d.dry}`} />
              </div>
              <p className="text-center text-[13px] text-sub">{d.week}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 flex gap-4 text-[13px] text-sub">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-husk/85" />Fresh</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-paddy-d" />Dry</span>
      </p>
    </div>
  );
}

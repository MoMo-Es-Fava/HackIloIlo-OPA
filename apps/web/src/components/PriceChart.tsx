import type { PricePoint } from "@/lib/data";

export default function PriceChart({ data }: { data: PricePoint[] }) {
  const max = Math.max(...data.flatMap((d) => [d.fresh, d.dry]), 1);
  return (
    <div>
      <div className="flex h-44 items-end gap-3" role="img" aria-label="Weekly fresh and dry prices per kilo">
        {data.map((d) => (
          <div key={d.week} className="flex h-full flex-1 flex-col justify-end gap-1">
            <div className="flex flex-1 items-end gap-1">
              <div className="flex-1 rounded-t bg-husk" style={{ height: `${(d.fresh / max) * 100}%` }} title={`Fresh ₱${d.fresh}`} />
              <div className="flex-1 rounded-t bg-paddy-d" style={{ height: `${(d.dry / max) * 100}%` }} title={`Dry ₱${d.dry}`} />
            </div>
            <p className="text-center text-xs text-sub">{d.week}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 flex gap-4 text-sm text-sub">
        <span><span aria-hidden className="mr-1 inline-block h-3 w-3 rounded-sm bg-husk" />Fresh</span>
        <span><span aria-hidden className="mr-1 inline-block h-3 w-3 rounded-sm bg-paddy-d" />Dry</span>
      </p>
    </div>
  );
}

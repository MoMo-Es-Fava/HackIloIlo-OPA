"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import { IconArrowRight, IconBag } from "@/components/icons";

export default function Offers() {
  const { offers } = useStore();
  const list = offers.filter((o) => o.kgAvailable > 0);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buy rice"
        sub="Choose a rice type, then enter how many kilograms you need."
        icon={<IconBag className="h-6 w-6" />}
      />
      {list.length === 0 && <Empty>No rice is in stock right now. Please check again later.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => (
          <Link
            key={o.id}
            href={`/buyer/offers/${o.id}`}
            className="group flex min-h-28 flex-col gap-1 rounded-2xl border border-line/80 bg-white p-5 shadow-card transition-all hover:border-paddy/50 hover:shadow-raised"
          >
            <p className="text-lg font-bold tracking-tight">{o.grade}</p>
            <p className="tnum text-2xl font-bold tracking-tight text-paddy-d">{peso(o.pricePerKg)}<span className="text-base font-normal text-sub"> per kg</span></p>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="tnum text-sm text-sub">{kgf(o.kgAvailable)} in stock</span>
              <span className="inline-flex items-center gap-1 font-bold text-paddy-d">
                Choose <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

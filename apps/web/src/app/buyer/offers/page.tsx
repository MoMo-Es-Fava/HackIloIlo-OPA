"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";

export default function Offers() {
  const { offers } = useStore();
  const list = offers.filter((o) => o.kgAvailable > 0);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Buy rice" sub="Choose a rice type, then enter how many kilograms you need." />
      {list.length === 0 && <Empty>No rice is in stock right now. Please check again later.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => (
          <Link key={o.id} href={`/buyer/offers/${o.id}`} className="flex min-h-28 flex-col gap-1 rounded-2xl border border-line bg-white p-4 hover:border-paddy-d">
            <p className="text-lg font-bold">{o.grade}</p>
            <p className="text-2xl font-bold text-paddy-d">{peso(o.pricePerKg)}<span className="text-base font-normal text-sub"> per kg</span></p>
            <p className="text-sm text-sub">{kgf(o.kgAvailable)} in stock</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

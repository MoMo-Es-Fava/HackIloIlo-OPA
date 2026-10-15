"use client";

import { OrderType } from "@irpc/types";
import StaffOrderBoard from "@/components/StaffOrderBoard";

export default function PalayProcurement() {
  return (
    <StaffOrderBoard
      type={OrderType.SELL_PALAY}
      title="Palay procurement"
      sub="Farmers selling palay to IRPC. Answer the same day, weigh, and pay."
      action={{ href: "/staff/palay/new", label: "New offer for a farmer" }}
    />
  );
}

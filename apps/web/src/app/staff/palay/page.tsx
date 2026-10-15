"use client";

import { OrderType } from "@irpc/types";
import StaffOrderBoard from "@/components/StaffOrderBoard";
import { IconLeaf } from "@/components/icons";

export default function PalayProcurement() {
  return (
    <StaffOrderBoard
      type={OrderType.SELL_PALAY}
      title="Palay procurement"
      sub="Farmers selling palay to IRPC. Answer the same day, weigh, and pay."
      icon={<IconLeaf className="h-6 w-6" />}
      action={{ href: "/staff/palay/new", label: "New offer for a farmer" }}
    />
  );
}

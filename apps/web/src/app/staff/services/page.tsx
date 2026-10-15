"use client";

import { OrderType } from "@irpc/types";
import StaffOrderBoard from "@/components/StaffOrderBoard";
import { IconFlame } from "@/components/icons";

export default function DryingAndMilling() {
  return (
    <StaffOrderBoard
      type={OrderType.SERVICE}
      title="Drying and milling"
      sub="Drying and milling requests from farmers and buyers. Confirm a date, weigh, process, and collect the fee."
      icon={<IconFlame className="h-6 w-6" />}
    />
  );
}
